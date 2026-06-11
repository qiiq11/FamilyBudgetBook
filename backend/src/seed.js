import 'dotenv/config';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from './db.js';

const username = '测试员';
const password = '666666';
const groupPassword = '666666';

// Create demo user (upsert: delete if exists, then recreate)
const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  console.log('演示账号已存在，重新创建...');
  // Delete all related data for this user
  const userId = existing.id;
  db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM family_members WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM group_members WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM family_groups WHERE creator_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  console.log('旧数据已清除');
}

const hash = bcrypt.hashSync(password, 10);
db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)')
  .run(username, hash, '测试员');

const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
const userId = user.id;

// Create demo family group
const groupHash = bcrypt.hashSync(groupPassword, 10);
const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
db.prepare(
  'INSERT INTO family_groups (name, invite_code, password_hash, creator_id) VALUES (?, ?, ?, ?)'
).run('测试家庭组', inviteCode, groupHash, userId);

const group = db.prepare('SELECT id FROM family_groups WHERE invite_code = ?').get(inviteCode);
const groupId = group.id;

// Add creator as group member with creator role
db.prepare(
  'INSERT INTO group_members (group_id, user_id, role, can_manage_permissions) VALUES (?, ?, ?, ?)'
).run(groupId, userId, 'creator', 1);

// Create creator as a linked family_member
db.prepare(
  'INSERT INTO family_members (user_id, group_id, linked_user_id, name, relation) VALUES (?, ?, ?, ?, ?)'
).run(userId, groupId, userId, '测试员', '创建者');

// Create virtual "额外" member
const extraResult = db.prepare(
  'INSERT INTO family_members (user_id, group_id, linked_user_id, name, relation) VALUES (?, ?, NULL, ?, ?)'
).run(userId, groupId, '额外', '其他');

// Seed default categories
const categories = [
  ['工资', 'income'],
  ['奖金', 'income'],
  ['兼职', 'income'],
  ['其他收入', 'income'],
  ['餐饮', 'expense'],
  ['交通', 'expense'],
  ['购物', 'expense'],
  ['住房', 'expense'],
  ['医疗', 'expense'],
  ['教育', 'expense'],
  ['娱乐', 'expense'],
  ['宠物', 'expense'],
  ['其他支出', 'expense'],
];
const insertCat = db.prepare(
  'INSERT INTO categories (user_id, group_id, name, type, sort_order) VALUES (?, ?, ?, ?, ?)'
);
const catIds = {};
categories.forEach(([name, type], i) => {
  insertCat.run(userId, groupId, name, type, i);
  const cat = db.prepare('SELECT id FROM categories WHERE group_id = ? AND name = ?').get(groupId, name);
  catIds[name] = cat.id;
});

// Get member IDs
const memberIds = db
  .prepare('SELECT id, name FROM family_members WHERE group_id = ?')
  .all(groupId)
  .reduce((acc, m) => ({ ...acc, [m.name]: m.id }), {});

// Seed demo transactions
const insertTx = db.prepare(
  `INSERT INTO transactions (user_id, group_id, member_id, category_id, amount, type, trans_date, note, status)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`
);

const today = new Date();

// Monthly salary
insertTx.run(
  userId, groupId,
  memberIds['测试员'],
  catIds['工资'],
  12000,
  'income',
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
  '本月工资'
);

for (let i = 0; i < 30; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  const date = d.toISOString().slice(0, 10);
  insertTx.run(userId, groupId, memberIds['测试员'], catIds['餐饮'], Math.round((25 + Math.random() * 40) * 100) / 100, 'expense', date, '午餐');
  insertTx.run(userId, groupId, memberIds['额外'], catIds['交通'], Math.round((5 + Math.random() * 15) * 100) / 100, 'expense', date, '交通');
  if (i % 3 === 0) {
    insertTx.run(userId, groupId, memberIds['测试员'], catIds['购物'], Math.round((50 + Math.random() * 200) * 100) / 100, 'expense', date, '日用品');
  }
}

console.log('演示数据已生成');
console.log('========================================');
console.log('  账号：测试员  密码：666666');
console.log('  家庭组：测试家庭组');
console.log('  邀请码：' + inviteCode + '  密码：' + groupPassword);
console.log('  创建者可在「我的家庭组」中看到邀请码');
console.log('  首次使用时请点击密码旁的编辑图标设置显示密码');
console.log('========================================');
