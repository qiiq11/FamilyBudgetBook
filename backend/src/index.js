import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import memberRoutes from './routes/members.js';
import categoryRoutes from './routes/categories.js';
import transactionRoutes from './routes/transactions.js';
import statsRoutes from './routes/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ status: 'ok', name: '家庭记账本 API' }));

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stats', statsRoutes);

if (isProd) {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) res.status(404).send('前端未构建，请先在 frontend 目录执行 npm run build');
    });
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: '服务器内部错误' });
});

app.listen(PORT, HOST, () => {
  const mode = isProd ? '生产' : '开发';
  console.log(`家庭记账本 [${mode}] http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT}`);
});
