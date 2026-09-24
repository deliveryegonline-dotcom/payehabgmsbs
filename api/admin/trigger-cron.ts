import type { Request, Response } from 'express';
import { handleAdminTriggerCron } from '../../src/server/routes/merchantRoutes.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method === 'POST') {
    return handleAdminTriggerCron(req, res);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
