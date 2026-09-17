import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {
  handleGetStore,
  handleHealth,
  handleLogin,
  handleLogout,
  handleMe,
  handlePutStore,
  type ApiResult,
} from './handlers.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));

function send(res: express.Response, result: ApiResult): void {
  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) {
      res.setHeader(k, v);
    }
  }
  res.status(result.status).json(result.body);
}

app.get('/api/health', async (_req, res) => {
  send(res, await handleHealth());
});

app.get('/api/store', async (_req, res) => {
  send(res, await handleGetStore());
});

app.put('/api/store', async (req, res) => {
  send(res, await handlePutStore(req.headers.cookie, req.body));
});

app.post('/api/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  send(res, await handleLogin(ip, req.body));
});

app.post('/api/logout', async (_req, res) => {
  send(res, await handleLogout());
});

app.get('/api/me', async (req, res) => {
  send(res, await handleMe(req.headers.cookie));
});

app.listen(PORT, () => {
  console.log(`FIFA Cup API em http://localhost:${PORT}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('ADMIN_PASSWORD não definido — usando senha padrão "admin" (só para dev)');
  }
  if (!process.env.TURSO_DATABASE_URL) {
    console.log('TURSO_DATABASE_URL não definido — usando data/local.db');
  }
});
