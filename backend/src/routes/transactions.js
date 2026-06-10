import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireGroup, requireWrite } from '../middleware/groupAuth.js';

const router = Router();
router.use(authMiddleware);
router.use(requireGroup);

const listSql = `
  SELECT t.id, t.amount, t.type, t.trans_date AS transDate, t.note,
         t.status, t.submitter_id AS submitterId,
         t.member_id AS memberId, m.name AS memberName,
         t.category_id AS categoryId, c.name AS categoryName
  FROM transactions t
  JOIN family_members m ON m.id = t.member_id
  JOIN categories c ON c.id = t.category_id
  WHERE t.group_id = ?
`;

// GET /api/transactions — list approved records only (all roles can view)
router.get('/', (req, res) => {
  const { type, memberId, categoryId, startDate, endDate, keyword, status, page = 1, pageSize = 20 } = req.query;
  let sql = listSql + ' AND t.status = ?';
  const statusFilter = status || 'approved';
  const params = [req.groupMember.group_id, statusFilter];

  if (type === 'income' || type === 'expense') {
    sql += ' AND t.type = ?';
    params.push(type);
  }
  if (memberId) {
    sql += ' AND t.member_id = ?';
    params.push(Number(memberId));
  }
  if (categoryId) {
    sql += ' AND t.category_id = ?';
    params.push(Number(categoryId));
  }
  if (startDate) {
    sql += ' AND t.trans_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND t.trans_date <= ?';
    params.push(endDate);
  }
  if (keyword?.trim()) {
    sql += ' AND (t.note LIKE ? OR c.name LIKE ?)';
    const kw = `%${keyword.trim()}%`;
    params.push(kw, kw);
  }

  let countSql = `
    SELECT COUNT(*) AS total FROM transactions t
    JOIN family_members m ON m.id = t.member_id
    JOIN categories c ON c.id = t.category_id
    WHERE t.group_id = ? AND t.status = ?
  `;
  const countParams = [req.groupMember.group_id, statusFilter];
  if (type === 'income' || type === 'expense') {
    countSql += ' AND t.type = ?';
    countParams.push(type);
  }
  if (memberId) {
    countSql += ' AND t.member_id = ?';
    countParams.push(Number(memberId));
  }
  if (categoryId) {
    countSql += ' AND t.category_id = ?';
    countParams.push(Number(categoryId));
  }
  if (startDate) {
    countSql += ' AND t.trans_date >= ?';
    countParams.push(startDate);
  }
  if (endDate) {
    countSql += ' AND t.trans_date <= ?';
    countParams.push(endDate);
  }
  if (keyword?.trim()) {
    countSql += ' AND (t.note LIKE ? OR c.name LIKE ?)';
    const kw = `%${keyword.trim()}%`;
    countParams.push(kw, kw);
  }
  const total = db.prepare(countSql).get(...countParams).total;

  sql += ' ORDER BY t.trans_date DESC, t.id DESC LIMIT ? OFFSET ?';
  const limit = Math.min(Number(pageSize) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
  params.push(limit, offset);

  const list = db.prepare(sql).all(...params);
  res.json({ list, total, page: Number(page) || 1, pageSize: limit });
});

// GET /api/transactions/pending — pending approvals (admin+ only)
router.get('/pending', requireWrite, (req, res) => {
  const list = db.prepare(`
    SELECT t.id, t.amount, t.type, t.trans_date AS transDate, t.note,
           t.status, t.submitter_id AS submitterId,
           t.member_id AS memberId, m.name AS memberName,
           t.category_id AS categoryId, c.name AS categoryName,
           u.username AS submitterName
    FROM transactions t
    JOIN family_members m ON m.id = t.member_id
    JOIN categories c ON c.id = t.category_id
    LEFT JOIN users u ON u.id = t.submitter_id
    WHERE t.group_id = ? AND t.status = 'pending'
    ORDER BY t.created_at ASC
  `).all(req.groupMember.group_id);

  res.json(list);
});

// POST /api/transactions — create transaction
// Admin/creator → auto-approved. Member → pending.
router.post('/', (req, res) => {
  const { memberId, categoryId, amount, type, transDate, note } = req.body;
  if (!memberId || !categoryId || !amount || !type || !transDate) {
    return res.status(400).json({ message: '请填写完整账目信息' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: '类型无效' });
  }
  const member = db
    .prepare('SELECT id FROM family_members WHERE id = ? AND group_id = ?')
    .get(memberId, req.groupMember.group_id);
  const category = db
    .prepare('SELECT id, type FROM categories WHERE id = ? AND group_id = ?')
    .get(categoryId, req.groupMember.group_id);
  if (!member) return res.status(400).json({ message: '家庭成员无效' });
  if (!category) return res.status(400).json({ message: '分类无效' });
  if (category.type !== type) return res.status(400).json({ message: '分类类型与收支类型不一致' });

  // Member submits → pending; admin/creator submits → approved
  const isWrite = req.groupMember.role !== 'member';
  const status = isWrite ? 'approved' : 'pending';

  const result = db
    .prepare(
      `INSERT INTO transactions (user_id, group_id, member_id, category_id, amount, type, trans_date, note, status, submitter_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, req.groupMember.group_id, memberId, categoryId, Number(amount), type, transDate, note?.trim() || '', status, req.user.id);

  // Fetch the newly inserted row
  const row = db.prepare(
    `${listSql} AND t.user_id = ? ORDER BY t.id DESC LIMIT 1`
  ).get(req.groupMember.group_id, req.user.id);

  const message = isWrite ? '已添加' : '已提交审核，等待管理员审批';
  res.status(201).json({ ...row, message });
});

// PUT /api/transactions/:id — update (admin+ only)
router.put('/:id', requireWrite, (req, res) => {
  const { memberId, categoryId, amount, type, transDate, note } = req.body;
  const existing = db
    .prepare('SELECT id FROM transactions WHERE id = ? AND group_id = ?')
    .get(req.params.id, req.groupMember.group_id);
  if (!existing) return res.status(404).json({ message: '记录不存在' });

  const category = db
    .prepare('SELECT type FROM categories WHERE id = ? AND group_id = ?')
    .get(categoryId, req.groupMember.group_id);
  if (category && category.type !== type) {
    return res.status(400).json({ message: '分类类型与收支类型不一致' });
  }

  db.prepare(
    `UPDATE transactions SET member_id = ?, category_id = ?, amount = ?, type = ?, trans_date = ?, note = ?
     WHERE id = ? AND group_id = ?`
  ).run(memberId, categoryId, Number(amount), type, transDate, note?.trim() || '', req.params.id, req.groupMember.group_id);

  res.json(db.prepare(`${listSql} AND t.id = ?`).get(req.groupMember.group_id, req.params.id));
});

// DELETE /api/transactions/:id — delete (admin+ only)
router.delete('/:id', requireWrite, (req, res) => {
  const result = db
    .prepare('DELETE FROM transactions WHERE id = ? AND group_id = ?')
    .run(req.params.id, req.groupMember.group_id);
  if (result.changes === 0) return res.status(404).json({ message: '记录不存在' });
  res.json({ message: '已删除' });
});

// PUT /api/transactions/:id/approve — approve pending (admin+ only)
router.put('/:id/approve', requireWrite, (req, res) => {
  const existing = db
    .prepare("SELECT id, status FROM transactions WHERE id = ? AND group_id = ? AND status = 'pending'")
    .get(req.params.id, req.groupMember.group_id);
  if (!existing) return res.status(404).json({ message: '待审批记录不存在或已处理' });

  db.prepare('UPDATE transactions SET status = ?, reviewer_id = ? WHERE id = ?')
    .run('approved', req.user.id, req.params.id);
  res.json({ message: '已通过' });
});

// PUT /api/transactions/:id/reject — reject pending (admin+ only)
router.put('/:id/reject', requireWrite, (req, res) => {
  const existing = db
    .prepare("SELECT id, status FROM transactions WHERE id = ? AND group_id = ? AND status = 'pending'")
    .get(req.params.id, req.groupMember.group_id);
  if (!existing) return res.status(404).json({ message: '待审批记录不存在或已处理' });

  db.prepare('UPDATE transactions SET status = ?, reviewer_id = ? WHERE id = ?')
    .run('rejected', req.user.id, req.params.id);
  res.json({ message: '已拒绝' });
});

export default router;
