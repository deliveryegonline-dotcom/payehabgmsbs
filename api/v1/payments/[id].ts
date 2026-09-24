import type { Request, Response } from 'express';
import { handleGetPayment } from '../../../src/server/routes/handlers.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method === 'GET') {
    // Vercel extracts route params into req.query
    const id = (req.query.id as string) || req.params.id;
    req.params = { ...req.params, id };
    return handleGetPayment(req, res);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
