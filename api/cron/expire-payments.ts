import type { Request, Response } from 'express';
import { handleCronExpirePayments } from '../../src/server/routes/handlers.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method === 'GET' || req.method === 'POST') {
    return handleCronExpirePayments(req, res);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
