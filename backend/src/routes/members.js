import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireGroup, requireWrite } from '../middleware/groupAuth.js';

const router = Router();
router.use(authMiddleware);
router.use(requireGroup);

// GET /api/members — list members (all roles can view)
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, relation, linked_user_id AS linkedUserId, created_at AS createdAt FROM family_members WHERE group_id = ? ORDER BY id')
    .all(req.groupMember.group_id);
  res.json(rows);
});

// POST /api/members — create member (admin+ only)
router.post('/', requireWrite, (req, res) => {
  const { name, relation } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: '成员姓名不能为空' });
  const result = db
    .prepare('INSERT INTO family_members (user_id, group_id, name, relation) VALUES (?, ?, ?, ?)')
    .run(req.user.id, req.groupMember.group_id, name.trim(), relation?.trim() || '');
  const row = db
    .prepare('SELECT id, name, relation FROM family_members WHERE group_id = ? AND name = ? ORDER BY id DESC LIMIT 1')
    .get(req.groupMember.group_id, name.trim());
  res.status(201).json(row);
});

// PUT /api/members/:id — update member (admin+ only)
router.put('/:id', requireWrite, (req, res) => {
  const { name, relation } = req.body;
  const existing = db
    .prepare('SELECT id FROM family_members WHERE id = ? AND group_id = ?')
    .get(req.params.id, req.groupMember.group_id);
  if (!existing) return res.status(404).json({ message: '成员不存在' });
  db.prepare('UPDATE family_members SET name = ?, relation = ? WHERE id = ?').run(
    name?.trim() || '',
    relation?.trim() || '',
    req.params.id
  );
  res.json(db.prepare('SELECT id, name, relation FROM family_members WHERE id = ?').get(req.params.id));
});

// DELETE /api/members/:id — delete member (admin+ only)
router.delete('/:id', requireWrite, (req, res) => {
  const count = db
    .prepare('SELECT COUNT(*) AS c FROM transactions WHERE member_id = ? AND group_id = ?')
    .get(req.params.id, req.groupMember.group_id);
  if (count.c > 0) return res.status(400).json({ message: '该成员有关联账目，无法删除' });
  const result = db
    .prepare('DELETE FROM family_members WHERE id = ? AND group_id = ?')
    .run(req.params.id, req.groupMember.group_id);
  if (result.changes === 0) return res.status(404).json({ message: '成员不存在' });
  res.json({ message: '已删除' });
});

export default router;
