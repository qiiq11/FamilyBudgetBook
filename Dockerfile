# 家庭记账本 - 单容器生产镜像（适合云服务器 Docker 部署）
FROM node:22-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install --omit=dev
COPY backend/ ./
COPY --from=frontend-build /build/frontend/dist /app/frontend/dist

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/data/family_budget.db

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000

CMD ["sh", "-c", "node src/seed.js; node src/index.js"]
