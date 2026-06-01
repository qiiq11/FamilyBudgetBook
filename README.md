# 家庭记账本 (FamilyBudgetBook)

家庭日常财务账目管理系统，满足课程项目 **家庭记账本（70）** 要求。

## 功能清单

| 模块 | 功能 |
|------|------|
| 收支分类 | 收入/支出分类的增删改查 |
| 收支管理 | 记账、编辑、删除，支持成员/分类/日期/关键词筛选 |
| 家庭成员 | 成员维护，账目按成员归属 |
| 收支查询 | 多条件组合查询与分页 |
| 汇总统计 | 按 **日/周/月/年**、**家庭成员**、**自定义日期** 汇总 |
| 分类统计 | 收入/支出分类明细表 |
| 结果展示 | **文字摘要**、**表格**、**ECharts 饼图/折线图/柱状图** |

## 技术栈

- **前端**：Vue 3 + TypeScript + Vite + Element Plus + ECharts + Pinia
- **后端**：Node.js + Express + SQLite（提供 MySQL 建表脚本供文档使用）
- **认证**：JWT

## 环境要求

- **Node.js 22.5+**（后端使用内置 `node:sqlite`）
- npm 9+

## 快速开始

```bash
# 终端 1 - 后端
cd backend
npm install
npm run seed    # 演示账号 demo / 123456
npm run dev

# 终端 2 - 前端
cd frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5173

## 项目结构（建议小组分工）

| 建议模块 | 内容 | 目录 |
|----------|------|------|
| A | 用户认证、成员管理 | `backend/src/routes/auth.js`, `members.js` + 对应前端页面 |
| B | 分类管理 | `categories.js` + `CategoriesView.vue` |
| C | 收支 CRUD 与查询 | `transactions.js` + `TransactionsView.vue` |
| D | 统计 API | `stats.js` + `StatisticsView.vue` |
| E | 首页仪表盘与图表 | `DashboardView.vue` |
| 集成 | 联调、部署、测试文档 | 全项目 |

## 提交材料目录

```
├── 00-项目访问地址.txt
├── 01-项目代码地址.txt
├── 02-需求与设计文档/   （需补充 .docx：需求分析、设计、数据库设计）
├── 03-过程材料/         （部署文档、测试用例、交流记录）
└── 04-最终源码包/       （打包 project_source.zip）
```

接口说明见 `02-需求与设计文档/接口设计文档.md`。

## 打包源码

将 `backend`（不含 node_modules）、`frontend`（不含 node_modules）、文档目录打包为 `04-最终源码包/project_source.zip`。接收方在各目录执行 `npm install` 即可运行。
