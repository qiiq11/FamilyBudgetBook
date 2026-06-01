import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const listSql = `
  SELECT t.id, t.amount, t.type, t.trans_date AS transDate, t.note,
         t.member_id AS memberId, m.name AS memberName,
         t.category_id AS categoryId, c.name AS categoryName
  FROM transactions t
  JOIN family_members m ON m.id = t.member_id
  JOIN categories c ON c.id = t.category_id
  WHERE t.user_id = ?
`;

router.get('/', (req, res) => {
  const { type, memberId, categoryId, startDate, endDate, keyword, page = 1, pageSize = 20 } = req.query;
  let sql = listSql;
  const params = [req.user.id];

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
    WHERE t.user_id = ?
  `;
  const countParams = [req.user.id];
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

router.post('/', (req, res) => {
  const { memberId, categoryId, amount, type, transDate, note } = req.body;
  if (!memberId || !categoryId || !amount || !type || !transDate) {
    return res.status(400).json({ message: '请填写完整账目信息' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: '类型无效' });
  }
  const member = db
    .prepare('SELECT id FROM family_members WHERE id = ? AND user_id = ?')
    .get(memberId, req.user.id);
  const category = db
    .prepare('SELECT id, type FROM categories WHERE id = ? AND user_id = ?')
    .get(categoryId, req.user.id);
  if (!member) return res.status(400).json({ message: '家庭成员无效' });
  if (!category) return res.status(400).json({ message: '分类无效' });
  if (category.type !== type) return res.status(400).json({ message: '分类类型与收支类型不一致' });

  const result = db
    .prepare(
      `INSERT INTO transactions (user_id, member_id, category_id, amount, type, trans_date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, memberId, categoryId, Number(amount), type, transDate, note?.trim() || '');

  const row = db.prepare(`${listSql} AND t.id = ?`).get(req.user.id, result.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const { memberId, categoryId, amount, type, transDate, note } = req.body;
  const existing = db
    .prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ message: '记录不存在' });

  const category = db
    .prepare('SELECT type FROM categories WHERE id = ? AND user_id = ?')
    .get(categoryId, req.user.id);
  if (category && category.type !== type) {
    return res.status(400).json({ message: '分类类型与收支类型不一致' });
  }

  db.prepare(
    `UPDATE transactions SET member_id = ?, category_id = ?, amount = ?, type = ?, trans_date = ?, note = ?
     WHERE id = ? AND user_id = ?`
  ).run(memberId, categoryId, Number(amount), type, transDate, note?.trim() || '', req.params.id, req.user.id);

  res.json(db.prepare(`${listSql} AND t.id = ?`).get(req.user.id, req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ message: '记录不存在' });
  res.json({ message: '已删除' });
});

export default router;
