import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ApiResult } from '../server/handlers.js';

export function sendVercel(res: VercelResponse, result: ApiResult): void {
  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) {
      res.setHeader(k, v);
    }
  }
  res.status(result.status).json(result.body);
}

export function clientIp(req: VercelRequest): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export function readBody(req: VercelRequest): unknown {
  return req.body;
}
