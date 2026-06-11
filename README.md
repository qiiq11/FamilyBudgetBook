# 家庭记账本 (FamilyBudgetBook)

家庭日常财务账目管理系统，满足课程项目 **家庭记账本（70）** 要求。

## 功能清单

| 模块 | 功能 |
|------|------|
| 首页概览 | **日历视图**（每日收支颜色标记、点击查看明细）、月度统计卡片、ECharts 图表分析 |
| 收支管理 | 记账、编辑、删除，支持成员/分类/日期/关键词筛选与分页 |
| 收支分类 | 收入/支出分类的增删改查 |
| 家庭成员 | 成员维护，支持关联用户与虚拟成员（如"额外"） |
| 家庭组系统 | 创建/加入家庭组（邀请码+密码），多家庭组切换 |
| 权限管理 | 三级角色：创建者/管理员/成员，审批流程（成员记账需管理员审核） |
| 汇总统计 | 按 **日/周/月/年**、**家庭成员**、**自定义日期** 汇总 |
| 分类统计 | 收入/支出分类明细表 |
| 结果展示 | **文字摘要**、**表格**、**ECharts 饼图/折线图/柱状图** |

## 技术栈

- **前端**：Vue 3 + TypeScript + Vite + Element Plus + ECharts + Pinia
- **后端**：Node.js 22 + Express + node:sqlite
- **认证**：JWT
- **部署**：华为云 ECS + PM2 + Nginx（支持 Docker Compose）

## 环境要求

- **Node.js 22.5+**（后端使用内置 `node:sqlite`）
- npm 9+

## 快速开始

```bash
# 1. 后端
cd backend
npm install
cp .env.example .env
node src/seed.js    # 生成演示数据
npm run dev         # http://localhost:3000

# 2. 前端
cd frontend
npm install
npm run dev         # http://localhost:5173
```

## 云端部署

**访问地址**：[http://123.60.7.243](http://123.60.7.243)

**健康检查**：[http://123.60.7.243/api/health](http://123.60.7.243/api/health)

**演示账号**：`测试员` / `666666`

**部署方案**：华为云弹性云服务器 ECS（1vCPU / 1GB / Ubuntu 24.04）+ Node.js 22 + PM2 + Nginx

**服务器部署脚本**：[deploy/clean-deploy.sh](deploy/clean-deploy.sh)

## 项目结构

```
FamilyBudgetBook/
├── backend/                  # Express + SQLite 后端
│   ├── src/
│   │   ├── index.js          # 入口，路由挂载，生产模式静态文件服务
│   │   ├── db.js             # SQLite 数据库层（6 表 + 7 索引）
│   │   ├── seed.js           # 演示数据播种
│   │   ├── middleware/       # JWT 认证 + 家庭组权限中间件
│   │   └── routes/           # auth / groups / members / categories / transactions / stats
│   └── data/                 # SQLite 数据库文件
├── frontend/                 # Vue 3 + TypeScript 前端
│   └── src/
│       ├── views/            # 9 个页面组件
│       ├── api/              # HTTP 封装 + API 接口
│       ├── stores/           # Pinia 状态管理（user / group）
│       ├── router/           # Vue Router 配置
│       ├── layouts/          # 主布局（导航栏 + 家庭组选择器）
│       └── styles/           # 全局暖色调主题
├── deploy/                   # 部署配置
│   ├── ecosystem.config.cjs  # PM2 配置
│   ├── nginx.conf            # Nginx 反向代理配置
│   └── clean-deploy.sh       # 一键清理部署脚本
├── docker-compose.yml        # Docker 部署
├── Dockerfile                # 多阶段 Docker 构建
└── DEPLOY.md                 # 详细部署文档
```
