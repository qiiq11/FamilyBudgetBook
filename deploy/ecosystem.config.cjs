/** PM2 配置：在 backend 目录的上一级执行 pm2 start deploy/ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'family-budget',
      cwd: './backend',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
        JWT_SECRET: '请改为随机长字符串',
        DB_PATH: './data/family_budget.db',
      },
    },
  ],
};
