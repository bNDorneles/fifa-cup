import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleLogout } from '../server/handlers.js';
import { sendVercel } from './_util.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  sendVercel(res, await handleLogout());
}
