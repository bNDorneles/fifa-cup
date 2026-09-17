import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleGetStore, handlePutStore } from '../server/handlers.js';
import { sendVercel } from './_util.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    sendVercel(res, await handleGetStore());
    return;
  }
  if (req.method === 'PUT') {
    sendVercel(res, await handlePutStore(req.headers.cookie, req.body));
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}
