import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT id, name, type, icon, sort_order AS sortOrder FROM categories WHERE user_id = ?';
  const params = [req.user.id];
  if (type === 'income' || type === 'expense') {
    sql += ' AND type = ?';
    params.push(type);
  }
  sql += ' ORDER BY type, sort_order, id';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { name, type, icon, sortOrder } = req.body;
  if (!name?.trim() || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: '请填写分类名称并选择收入或支出类型' });
  }
  const result = db
    .prepare('INSERT INTO categories (user_id, name, type, icon, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, name.trim(), type, icon || '', sortOrder ?? 0);
  const row = db
    .prepare('SELECT id, name, type, icon, sort_order AS sortOrder FROM categories WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const { name, icon, sortOrder } = req.body;
  const existing = db
    .prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ message: '分类不存在' });
  db.prepare('UPDATE categories SET name = ?, icon = ?, sort_order = ? WHERE id = ?').run(
    name?.trim(),
    icon || '',
    sortOrder ?? 0,
    req.params.id
  );
  res.json(
    db.prepare('SELECT id, name, type, icon, sort_order AS sortOrder FROM categories WHERE id = ?').get(req.params.id)
  );
});

router.delete('/:id', (req, res) => {
  const count = db
    .prepare('SELECT COUNT(*) AS c FROM transactions WHERE category_id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (count.c > 0) return res.status(400).json({ message: '该分类下存在账目记录，无法删除' });
  const result = db
    .prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ message: '分类不存在' });
  res.json({ message: '已删除' });
});

export default router;
