import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireGroup } from '../middleware/groupAuth.js';

const router = Router();
router.use(authMiddleware);
router.use(requireGroup);

function dateRange(period, refDate) {
  const d = refDate ? new Date(refDate) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  if (period === 'day') {
    const s = fmt(d);
    return { start: s, end: s, label: s };
  }
  if (period === 'week') {
    const day = d.getDay() || 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - day + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: fmt(mon), end: fmt(sun), label: `${fmt(mon)} ~ ${fmt(sun)}` };
  }
  if (period === 'month') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      start: fmt(start),
      end: fmt(end),
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
    };
  }
  if (period === 'year') {
    return {
      start: `${d.getFullYear()}-01-01`,
      end: `${d.getFullYear()}-12-31`,
      label: `${d.getFullYear()}年`,
    };
  }
  return null;
}

// GET /api/stats/summary
router.get('/summary', (req, res) => {
  const { period, refDate, memberId, startDate, endDate } = req.query;
  let start = startDate;
  let end = endDate;
  let label = `${startDate || ''} ~ ${endDate || ''}`;

  if (period && ['day', 'week', 'month', 'year'].includes(period)) {
    const range = dateRange(period, refDate);
    start = range.start;
    end = range.end;
    label = range.label;
  }
  if (!start || !end) {
    return res.status(400).json({ message: '请指定统计周期或起止日期' });
  }

  let sql = `
    SELECT type, SUM(amount) AS total, COUNT(*) AS count
    FROM transactions
    WHERE group_id = ? AND trans_date >= ? AND trans_date <= ?
  `;
  const params = [req.groupMember.group_id, start, end];
  if (memberId) {
    sql += ' AND member_id = ?';
    params.push(Number(memberId));
  }
  sql += ' GROUP BY type';

  const rows = db.prepare(sql).all(...params);
  let income = 0,
    expense = 0,
    incomeCount = 0,
    expenseCount = 0;
  rows.forEach((r) => {
    if (r.type === 'income') {
      income = r.total;
      incomeCount = r.count;
    } else {
      expense = r.total;
      expenseCount = r.count;
    }
  });

  const memberName = memberId
    ? db.prepare('SELECT name FROM family_members WHERE id = ?').get(memberId)?.name
    : '全部成员';

  res.json({
    period: period || 'custom',
    label,
    startDate: start,
    endDate: end,
    memberId: memberId ? Number(memberId) : null,
    memberName,
    income: Number(income.toFixed(2)),
    expense: Number(expense.toFixed(2)),
    balance: Number((income - expense).toFixed(2)),
    incomeCount,
    expenseCount,
    summaryText: `统计区间：${label}；成员：${memberName}。收入合计 ¥${income.toFixed(2)}（${incomeCount}笔），支出合计 ¥${expense.toFixed(2)}（${expenseCount}笔），结余 ¥${(income - expense).toFixed(2)}。`,
  });
});

// GET /api/stats/by-category
router.get('/by-category', (req, res) => {
  const { type, startDate, endDate, memberId } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ message: '请指定起止日期' });
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: '请指定 income 或 expense' });
  }

  let sql = `
    SELECT c.id AS categoryId, c.name AS categoryName, SUM(t.amount) AS total, COUNT(*) AS count
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.group_id = ? AND t.type = ? AND t.trans_date >= ? AND t.trans_date <= ?
  `;
  const params = [req.groupMember.group_id, type, startDate, endDate];
  if (memberId) {
    sql += ' AND t.member_id = ?';
    params.push(Number(memberId));
  }
  sql += ' GROUP BY c.id ORDER BY total DESC';

  const list = db.prepare(sql).all(...params).map((r) => ({
    ...r,
    total: Number(r.total.toFixed(2)),
  }));
  const sum = list.reduce((a, b) => a + b.total, 0);
  res.json({ list, total: Number(sum.toFixed(2)), type });
});

// GET /api/stats/by-member
router.get('/by-member', (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ message: '请指定起止日期' });

  const sql = `
    SELECT m.id AS memberId, m.name AS memberName, t.type, SUM(t.amount) AS total, COUNT(*) AS count
    FROM transactions t
    JOIN family_members m ON m.id = t.member_id
    WHERE t.group_id = ? AND t.trans_date >= ? AND t.trans_date <= ?
    GROUP BY m.id, t.type
    ORDER BY m.id, t.type
  `;
  const rows = db.prepare(sql).all(req.groupMember.group_id, startDate, endDate);

  const map = {};
  rows.forEach((r) => {
    if (!map[r.memberId]) {
      map[r.memberId] = {
        memberId: r.memberId,
        memberName: r.memberName,
        income: 0,
        expense: 0,
        incomeCount: 0,
        expenseCount: 0,
      };
    }
    if (r.type === 'income') {
      map[r.memberId].income = Number(r.total.toFixed(2));
      map[r.memberId].incomeCount = r.count;
    } else {
      map[r.memberId].expense = Number(r.total.toFixed(2));
      map[r.memberId].expenseCount = r.count;
    }
    map[r.memberId].balance = Number((map[r.memberId].income - map[r.memberId].expense).toFixed(2));
  });

  res.json({ list: Object.values(map) });
});

// GET /api/stats/trend
router.get('/trend', (req, res) => {
  const { startDate, endDate, groupBy = 'day', memberId } = req.query;
  if (!startDate || !endDate) return res.status(400).json({ message: '请指定起止日期' });

  const fmt =
    groupBy === 'month'
      ? "strftime('%Y-%m', trans_date)"
      : groupBy === 'week'
        ? "strftime('%Y-W%W', trans_date)"
        : 'trans_date';

  let sql = `
    SELECT ${fmt} AS period, type, SUM(amount) AS total
    FROM transactions
    WHERE group_id = ? AND trans_date >= ? AND trans_date <= ?
  `;
  const params = [req.groupMember.group_id, startDate, endDate];
  if (memberId) {
    sql += ' AND member_id = ?';
    params.push(Number(memberId));
  }
  sql += ` GROUP BY period, type ORDER BY period`;

  const rows = db.prepare(sql).all(...params);
  const periods = [...new Set(rows.map((r) => r.period))].sort();
  const trend = periods.map((p) => {
    const income = rows.find((r) => r.period === p && r.type === 'income')?.total || 0;
    const expense = rows.find((r) => r.period === p && r.type === 'expense')?.total || 0;
    return {
      period: p,
      income: Number(income.toFixed(2)),
      expense: Number(expense.toFixed(2)),
      balance: Number((income - expense).toFixed(2)),
    };
  });

  res.json({ trend });
});

// GET /api/stats/calendar — daily summary for calendar view
router.get('/calendar', (req, res) => {
  const { year, month } = req.query;
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || (new Date().getMonth() + 1);

  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  // Last day of month
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const rows = db.prepare(`
    SELECT trans_date AS date, type, SUM(amount) AS total
    FROM transactions
    WHERE group_id = ? AND status = 'approved'
      AND trans_date >= ? AND trans_date <= ?
    GROUP BY trans_date, type
    ORDER BY trans_date
  `).all(req.groupMember.group_id, startDate, endDate);

  // Build day-by-day map
  const dayMap = {};
  rows.forEach((r) => {
    if (!dayMap[r.date]) dayMap[r.date] = { income: 0, expense: 0 };
    dayMap[r.date][r.type] = Number(r.total.toFixed(2));
  });

  const days = [];
  for (let d = 1; d <= lastDay; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const day = dayMap[date] || { income: 0, expense: 0 };
    days.push({
      date,
      day: d,
      weekday: new Date(y, m - 1, d).getDay(), // 0=Sun
      income: day.income,
      expense: day.expense,
      balance: Number((day.income - day.expense).toFixed(2)),
    });
  }

  res.json({ year: y, month: m, lastDay, days });
});

export default router;
