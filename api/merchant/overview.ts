import type { Request, Response } from 'express';
import { handleMerchantOverview } from '../../src/server/routes/merchantRoutes.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method === 'GET') {
    return handleMerchantOverview(req, res);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
