#!/bin/bash
# ============================================================
# 家庭记账本 v2.0 - 服务器端一键清理部署脚本
# 用途：完全清除旧版本，只保留 v2.0（含 Nginx 缓存控制）
# 执行方式：在华为云 CloudShell 中粘贴运行
# ============================================================
set -e

echo "==============================================="
echo "  家庭记账本 v2.0 一键清理部署"
echo "==============================================="

# === 1. 拉取最新代码 ===
echo ""
echo "[1/7] 拉取最新代码并清理旧文件..."
cd /root/FamilyBudgetBook
pm2 stop family-budget 2>/dev/null || true

# 彻底清除旧的前端 dist 文件（git reset 不会删除 untracked 旧文件）
rm -rf frontend/dist
git fetch origin main
git reset --hard origin/main

# === 2. 彻底清除旧数据库 ===
echo ""
echo "[2/7] 清除旧数据库..."
cd /root/FamilyBudgetBook/backend
pm2 stop family-budget 2>/dev/null || true
rm -f data/family_budget.db
rm -f data/family_budget.db-shm
rm -f data/family_budget.db-wal

# === 3. 重新 seed 演示数据 ===
echo ""
echo "[3/7] 生成 v2.0 演示数据..."
node src/seed.js

# === 4. 确保 .env 文件正确 ===
echo ""
echo "[4/7] 配置环境变量..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=family-budget-production-secret-key-2026
DB_PATH=./data/family_budget.db
EOF

# === 5. 更新 Nginx 配置（禁止缓存 index.html） ===
echo ""
echo "[5/7] 更新 Nginx 配置（禁止缓存 index.html）..."
sudo tee /etc/nginx/sites-available/family-budget << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 10m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 带 hash 的静态资源可以长期缓存
    location /assets/ {
        root /root/FamilyBudgetBook/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # index.html 禁止缓存
    location / {
        root /root/FamilyBudgetBook/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
}
NGINX_EOF

sudo nginx -t && sudo systemctl reload nginx

# === 6. 启动服务 ===
echo ""
echo "[6/7] 启动 PM2 服务..."
cd /root/FamilyBudgetBook
pm2 start deploy/ecosystem.config.cjs
pm2 save

# === 7. 验证 ===
echo ""
echo "[7/7] 验证部署..."
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
else
  echo ""
  echo "❌ 登录失败，请检查 seed 是否成功执行"
fi

echo ""
echo "==============================================="
echo "  部署完成！访问 http://123.60.7.243"
echo "  演示账号：测试员 / 666666"
echo "==============================================="
