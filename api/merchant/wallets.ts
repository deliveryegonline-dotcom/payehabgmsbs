import type { Request, Response } from 'express';
import { handleListWallets, handleCreateWallet } from '../../src/server/routes/merchantRoutes.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method === 'GET') {
    return handleListWallets(req, res);
  }
  if (req.method === 'POST') {
    return handleCreateWallet(req, res);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
