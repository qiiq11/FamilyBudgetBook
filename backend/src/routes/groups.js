import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireGroup, requireRole, requireManagePermissions } from '../middleware/groupAuth.js';

const router = Router();
router.use(authMiddleware);

// Generate a random 8-character invite code
function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Seed default members and categories for a new group
function seedGroupDefaults(groupId, userId) {
  // Create the creator as a linked member
  const creator = db.prepare('SELECT username, display_name FROM users WHERE id = ?').get(userId);
  db.prepare('INSERT INTO family_members (user_id, group_id, linked_user_id, name, relation) VALUES (?, ?, ?, ?, ?)')
    .run(userId, groupId, userId, creator.display_name || creator.username, '创建者');

  // Create a virtual "额外" member for non-user expenses/incomes
  db.prepare('INSERT INTO family_members (user_id, group_id, linked_user_id, name, relation) VALUES (?, ?, NULL, ?, ?)')
    .run(userId, groupId, '额外', '其他');

  const categories = [
    ['工资', 'income'], ['奖金', 'income'], ['理财', 'income'], ['其他收入', 'income'],
    ['餐饮', 'expense'], ['交通', 'expense'], ['购物', 'expense'], ['住房', 'expense'],
    ['医疗', 'expense'], ['教育', 'expense'], ['娱乐', 'expense'], ['其他支出', 'expense'],
  ];
  const insertCat = db.prepare(
    'INSERT INTO categories (user_id, group_id, name, type, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  categories.forEach(([name, type], i) => insertCat.run(userId, groupId, name, type, i));
}

// POST /api/groups — Create a new family group
router.post('/', (req, res) => {
  const { name, password } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: '家庭组名称不能为空' });
  if (!password || password.length < 4) return res.status(400).json({ message: '家庭组密码至少4位' });

  const inviteCode = generateInviteCode();
  const hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(
    'INSERT INTO family_groups (name, invite_code, password_hash, creator_id) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), inviteCode, hash, req.user.id);

  const group = db.prepare('SELECT id FROM family_groups WHERE invite_code = ?').get(inviteCode);
  const groupId = group.id;

  // Add creator as a member with 'creator' role
  db.prepare(
    'INSERT INTO group_members (group_id, user_id, role, can_manage_permissions) VALUES (?, ?, ?, ?)'
  ).run(groupId, req.user.id, 'creator', 1);

  // Seed default data
  seedGroupDefaults(groupId, req.user.id);

  res.status(201).json({
    id: groupId,
    name: name.trim(),
    inviteCode,
    role: 'creator',
    canManagePermissions: true,
  });
});

// GET /api/groups — List groups the current user belongs to
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT g.id, g.name, g.invite_code AS inviteCode, g.password_hash AS passwordHash,
           g.creator_id AS creatorId,
           gm.role, gm.can_manage_permissions AS canManagePermissions,
           g.created_at AS createdAt
    FROM family_groups g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE gm.user_id = ?
    ORDER BY g.created_at DESC
  `).all(req.user.id);

  res.json(rows);
});

// GET /api/groups/:id — Get group details
router.get('/:id', requireGroup, (req, res) => {
  const group = db.prepare(`
    SELECT g.id, g.name, g.invite_code AS inviteCode, g.creator_id AS creatorId,
           g.created_at AS createdAt
    FROM family_groups g WHERE g.id = ?
  `).get(req.params.id);

  if (!group) return res.status(404).json({ message: '家庭组不存在' });

  res.json({
    ...group,
    myRole: req.groupMember.role,
    myCanManagePermissions: !!req.groupMember.can_manage_permissions,
  });
});

// PUT /api/groups/:id — Update group name or password (creator only)
router.put('/:id', requireGroup, requireRole('creator'), (req, res) => {
  const { name, password } = req.body;
  const updates = [];
  const params = [];

  if (name?.trim()) {
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (password && password.length >= 4) {
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(password, 10));
  }

  if (updates.length === 0) return res.status(400).json({ message: '请提供要修改的信息' });

  params.push(req.params.id);
  db.prepare(`UPDATE family_groups SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: '更新成功' });
});

// DELETE /api/groups/:id — Delete group (creator only)
router.delete('/:id', requireGroup, requireRole('creator'), (req, res) => {
  db.prepare('DELETE FROM family_groups WHERE id = ?').run(req.params.id);
  res.json({ message: '已删除' });
});

// POST /api/groups/join — Join a group by invite_code + password
router.post('/join', (req, res) => {
  const { inviteCode, password } = req.body;
  if (!inviteCode?.trim() || !password) {
    return res.status(400).json({ message: '请输入邀请码和密码' });
  }

  const group = db.prepare('SELECT * FROM family_groups WHERE invite_code = ?').get(inviteCode.trim().toUpperCase());
  if (!group) return res.status(404).json({ message: '家庭组不存在，请检查邀请码' });

  if (!bcrypt.compareSync(password, group.password_hash)) {
    return res.status(401).json({ message: '密码错误' });
  }

  const existing = db.prepare(
    'SELECT id, role FROM group_members WHERE group_id = ? AND user_id = ?'
  ).get(group.id, req.user.id);

  if (existing) {
    return res.status(400).json({ message: '您已是该家庭组的成员' });
  }

  db.prepare(
    'INSERT INTO group_members (group_id, user_id, role, can_manage_permissions) VALUES (?, ?, ?, ?)'
  ).run(group.id, req.user.id, 'member', 0);

  // Auto-create a linked member record for the new user
  const user = db.prepare('SELECT username, display_name FROM users WHERE id = ?').get(req.user.id);
  const alreadyMember = db.prepare(
    'SELECT id FROM family_members WHERE group_id = ? AND linked_user_id = ?'
  ).get(group.id, req.user.id);
  if (!alreadyMember) {
    db.prepare(
      'INSERT INTO family_members (user_id, group_id, linked_user_id, name, relation) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, group.id, req.user.id, user.display_name || user.username, '用户');
  }

  res.json({
    id: group.id,
    name: group.name,
    inviteCode: group.invite_code,
    role: 'member',
    canManagePermissions: false,
  });
});

// GET /api/groups/:id/members — List members with roles
router.get('/:id/members', requireGroup, (req, res) => {
  const members = db.prepare(`
    SELECT u.id, u.username, u.display_name AS displayName,
           gm.role, gm.can_manage_permissions AS canManagePermissions,
           gm.joined_at AS joinedAt
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY
      CASE gm.role
        WHEN 'creator' THEN 0
        WHEN 'admin' THEN 1
        ELSE 2
      END,
      gm.joined_at ASC
  `).all(req.params.id);

  res.json(members);
});

// PUT /api/groups/:id/members/:userId — Change member role/permissions
router.put('/:id/members/:userId', requireGroup, requireManagePermissions, (req, res) => {
  const { role, canManagePermissions } = req.body;
  const targetUserId = Number(req.params.userId);
  const groupId = Number(req.params.id);

  // Cannot modify own permissions
  if (targetUserId === req.user.id) {
    return res.status(400).json({ message: '不能修改自己的权限' });
  }

  const target = db.prepare(
    'SELECT id, role FROM group_members WHERE group_id = ? AND user_id = ?'
  ).get(groupId, targetUserId);

  if (!target) return res.status(404).json({ message: '该成员不在家庭组中' });

  // Cannot change the creator's role
  if (target.role === 'creator') {
    return res.status(400).json({ message: '不能修改创建者的角色' });
  }

  // Build update
  const updates = [];
  const params = [];

  if (role) {
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: '角色只能是 admin 或 member' });
    }
    updates.push('role = ?');
    params.push(role);
  }

  if (canManagePermissions !== undefined) {
    updates.push('can_manage_permissions = ?');
    params.push(canManagePermissions ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: '请提供要修改的权限参数' });
  }

  params.push(groupId, targetUserId);
  db.prepare(
    `UPDATE group_members SET ${updates.join(', ')} WHERE group_id = ? AND user_id = ?`
  ).run(...params);

  const updated = db.prepare(`
    SELECT u.id, u.username, u.display_name AS displayName,
           gm.role, gm.can_manage_permissions AS canManagePermissions
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ? AND gm.user_id = ?
  `).get(groupId, targetUserId);

  res.json(updated);
});

// DELETE /api/groups/:id/members/:userId — Remove member (creator only)
router.delete('/:id/members/:userId', requireGroup, requireRole('creator'), (req, res) => {
  const targetUserId = Number(req.params.userId);
  const groupId = Number(req.params.id);

  if (targetUserId === req.user.id) {
    return res.status(400).json({ message: '不能移除自己，如需退出请删除家庭组' });
  }

  const target = db.prepare(
    'SELECT id, role FROM group_members WHERE group_id = ? AND user_id = ?'
  ).get(groupId, targetUserId);

  if (!target) return res.status(404).json({ message: '该成员不在家庭组中' });

  if (target.role === 'creator') {
    return res.status(400).json({ message: '不能移除创建者' });
  }

  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, targetUserId);
  res.json({ message: '已移除成员' });
});

export default router;
