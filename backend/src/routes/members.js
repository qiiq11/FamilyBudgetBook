import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT id, name, relation, created_at AS createdAt FROM family_members WHERE user_id = ? ORDER BY id')
    .all(req.user.id);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, relation } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: '成员姓名不能为空' });
  const result = db
    .prepare('INSERT INTO family_members (user_id, name, relation) VALUES (?, ?, ?)')
    .run(req.user.id, name.trim(), relation?.trim() || '');
  const row = db.prepare('SELECT id, name, relation FROM family_members WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const { name, relation } = req.body;
  const existing = db
    .prepare('SELECT id FROM family_members WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ message: '成员不存在' });
  db.prepare('UPDATE family_members SET name = ?, relation = ? WHERE id = ?').run(
    name?.trim() || '',
    relation?.trim() || '',
    req.params.id
  );
  res.json(db.prepare('SELECT id, name, relation FROM family_members WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const count = db
    .prepare('SELECT COUNT(*) AS c FROM transactions WHERE member_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (count.c > 0) return res.status(400).json({ message: '该成员有关联账目，无法删除' });
  const result = db
    .prepare('DELETE FROM family_members WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ message: '成员不存在' });
  res.json({ message: '已删除' });
});

export default router;
