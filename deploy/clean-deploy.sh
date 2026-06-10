#!/bin/bash
# ============================================================
# 家庭记账本 v2.0 - 服务器端一键清理部署脚本
# 用途：完全清除旧版本（v1数据库/旧前端），只保留 v2.0
# 执行方式：在华为云 CloudShell 中粘贴运行
# ============================================================
set -e

echo "==============================================="
echo "  家庭记账本 v2.0 一键清理部署"
echo "==============================================="

# === 1. 拉取最新代码 ===
echo ""
echo "[1/6] 拉取最新代码..."
cd /root/FamilyBudgetBook
git fetch origin main
git reset --hard origin/main

# === 2. 彻底清除旧数据库 ===
echo ""
echo "[2/6] 清除旧数据库..."
cd /root/FamilyBudgetBook/backend
pm2 stop family-budget 2>/dev/null || true
rm -f data/family_budget.db
rm -f data/family_budget.db-shm
rm -f data/family_budget.db-wal

# === 3. 重新 seed 演示数据 ===
echo ""
echo "[3/6] 生成 v2.0 演示数据..."
node src/seed.js

# === 4. 确保 .env 文件正确 ===
echo ""
echo "[4/6] 配置环境变量..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=family-budget-production-secret-key-2026
DB_PATH=./data/family_budget.db
EOF

# === 5. 启动服务 ===
echo ""
echo "[5/6] 启动 PM2 服务..."
pm2 start /root/FamilyBudgetBook/deploy/ecosystem.config.cjs
pm2 save

# === 6. 验证 ===
echo ""
echo "[6/6] 验证部署..."
sleep 2

echo ""
echo "--- PM2 状态 ---"
pm2 status

echo ""
echo "--- API 健康检查 ---"
curl -s http://localhost:3000/api/health
echo ""

echo ""
echo "--- 验证 seed 账号（测试员/666666）---"
LOGIN_RESULT=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"测试员","password":"666666"}')
echo "$LOGIN_RESULT"

if echo "$LOGIN_RESULT" | grep -q '"token"'; then
  echo ""
  echo "✅ 登录成功！v2.0 部署完成！"
  echo ""
  TOKEN=$(echo "$LOGIN_RESULT" | sed 's/.*"token":"\([^"]*\)".*/\1/')

  echo "--- 验证 groups API ---"
  curl -s http://localhost:3000/api/groups -H "Authorization: Bearer $TOKEN"
  echo ""
else
  echo ""
  echo "❌ 登录失败，请检查 seed 是否成功执行"
fi

echo ""
echo "==============================================="
echo "  部署完成！访问 http://123.60.7.243"
echo "  演示账号：测试员 / 666666"
echo "==============================================="
