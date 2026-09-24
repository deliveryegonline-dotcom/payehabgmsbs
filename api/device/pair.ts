import type { Request, Response } from 'express';
import { handleDevicePair } from '../../src/server/routes/handlers.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  return handleDevicePair(req, res);
}
