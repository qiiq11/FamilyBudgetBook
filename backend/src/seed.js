import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from './db.js';

const username = 'demo';
const password = '123456';

const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (exists) {
  console.log('演示账号已存在：demo / 123456');
  process.exit(0);
}

const hash = bcrypt.hashSync(password, 10);
const result = db
  .prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)')
  .run(username, hash, '演示家庭');

const userId = result.lastInsertRowid;
const members = [
  ['爸爸', '父亲'],
  ['妈妈', '母亲'],
  ['小明', '孩子'],
];
const insertMember = db.prepare('INSERT INTO family_members (user_id, name, relation) VALUES (?, ?, ?)');
members.forEach(([name, rel]) => insertMember.run(userId, name, rel));

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
  ['其他支出', 'expense'],
];
const insertCat = db.prepare(
  'INSERT INTO categories (user_id, name, type, sort_order) VALUES (?, ?, ?, ?)'
);
const catIds = {};
categories.forEach(([name, type], i) => {
  const r = insertCat.run(userId, name, type, i);
  catIds[name] = r.lastInsertRowid;
});

const memberIds = db
  .prepare('SELECT id, name FROM family_members WHERE user_id = ?')
  .all(userId)
  .reduce((acc, m) => ({ ...acc, [m.name]: m.id }), {});

const insertTx = db.prepare(
  `INSERT INTO transactions (user_id, member_id, category_id, amount, type, trans_date, note)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const today = new Date();
if (!db.prepare('SELECT COUNT(*) AS c FROM transactions WHERE user_id = ?').get(userId).c) {
  insertTx.run(
    userId,
    memberIds['爸爸'],
    catIds['工资'],
    12000,
    'income',
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
    '本月工资'
  );
}

for (let i = 0; i < 30; i++) {
  const d = new Date(today);
  d.setDate(today.getDate() - i);
  const date = d.toISOString().slice(0, 10);
  insertTx.run(userId, memberIds['妈妈'], catIds['餐饮'], 35 + Math.random() * 50, 'expense', date, '午餐');
  insertTx.run(userId, memberIds['小明'], catIds['交通'], 5 + Math.random() * 10, 'expense', date, '公交');
  if (i % 3 === 0) {
    insertTx.run(userId, memberIds['妈妈'], catIds['购物'], 100 + Math.random() * 200, 'expense', date, '日用品');
  }
}

console.log('演示数据已生成');
console.log('账号：demo  密码：123456');
