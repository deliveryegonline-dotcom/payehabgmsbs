import type { Request, Response } from 'express';
import { handleListApiKeys, handleCreateApiKey } from '../../src/server/routes/merchantRoutes.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method === 'GET') {
    return handleListApiKeys(req, res);
  }
  if (req.method === 'POST') {
    return handleCreateApiKey(req, res);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
