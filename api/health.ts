import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleHealth } from '../server/handlers.js';
import { sendVercel } from './_util.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  sendVercel(res, await handleHealth());
}
