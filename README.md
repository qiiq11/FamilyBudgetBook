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

## 公网访问

**线上地址**：http://123.60.7.243

**演示账号**：`demo` / `123456`

## 健康检查

http://123.60.7.243/api/health
