import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username?.trim() || !password || password.length < 6) {
    return res.status(400).json({ message: '用户名不能为空，密码至少6位' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (exists) return res.status(400).json({ message: '用户名已存在' });

  const hash = bcrypt.hashSync(password, 10);
  db
    .prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)')
    .run(username.trim(), hash, displayName?.trim() || username.trim());

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  const userId = user.id;

  const token = signToken({ id: userId, username: username.trim() });
  res.json({
    token,
    user: { id: userId, username: username.trim(), displayName: displayName?.trim() || username.trim() },
  });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username?.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: '用户名或密码错误' });
  }
  const token = signToken({ id: user.id, username: user.username });
  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.display_name },
  });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ message: '用户不存在' });
  res.json({ id: user.id, username: user.username, displayName: user.display_name });
});

export default router;
