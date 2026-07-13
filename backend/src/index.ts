import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';
import importRoutes from './routes/import.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { initSocket } from './sockets/socket';

const app = express();
const httpServer = http.createServer(app);

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Pastikan folder storage ada
const storageDir = process.env.STORAGE_DIR || './storage';
for (const sub of ['uploads', 'outputs']) {
  const dir = path.join(storageDir, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/import', importRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handler global (termasuk error dari multer fileFilter)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Terjadi kesalahan' });
});

initSocket(httpServer, corsOrigin);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Sigma Sales API berjalan di port ${PORT}`);
});
