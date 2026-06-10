SSH 端口（22）能建立 TCP 连接但服务端立即断开，可能是安全组限制了 SSH 访问。你可以通过华为云控制台的 **VNC 远程登录/CloudShell** 进入服务器，然后执行以下命令完成部署：

---

## 服务器端一键修复脚本

**在服务器 CloudShell 中执行：**

```bash
# === 1. 拉取最新代码（包含修复后的完整前端构建产物）===
cd /root/FamilyBudgetBook
git pull

# === 2. 停服务，清空旧数据库，重新 seed ===
cd /root/FamilyBudgetBook/backend
pm2 stop family-budget
rm -f data/family_budget.db
node src/seed.js

# === 3. 确保 .env 文件存在 ===
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=family-budget-production-secret-key-2026
DB_PATH=./data/family_budget.db
EOF

# === 4. 启动服务 ===
pm2 start /root/FamilyBudgetBook/deploy/ecosystem.config.cjs

# === 5. 验证 ===
sleep 2
pm2 status
echo "=== 健康检查 ==="
curl -s http://localhost:3000/api/health
echo ""
echo "=== 验证 seed 账号 ==="
curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"测试员","password":"666666"}'
echo ""
echo "=== 验证前端 JS 文件 ==="
curl -sI http://localhost:3000/assets/index-DcuNnFby.js 2>&1 | head -5
```

---

## 验证清单

部署完成后访问：http://123.60.7.243

- [ ] 能看到登录页面（暖色调新主题）
- [ ] 用 `测试员` / `666666` 登录成功
- [ ] 首页显示日历视图（每日收支颜色标记）
- [ ] 收支管理可正常记账
- [ ] 我的家庭组页面显示邀请码和密码（刷新页面后密码不丢失）
- [ ] 审批管理页面正常

---

## SSH 无法连接的解决方法

在华为云控制台检查：
1. **安全组** → 入方向规则 → 确保 **TCP 22** 端口对 `0.0.0.0/0` 开放
2. 如果还是不行，在服务器上执行 `sudo systemctl restart sshd`
