import type { Request, Response } from 'express';
import { handleCustomerVerifyPayment } from '../../../../src/server/routes/handlers.ts';

export default async function handler(req: Request, res: Response) {
  if (req.method === 'POST') {
    const id = (req.query.id as string) || req.params.id;
    req.params = { ...req.params, id };
    return handleCustomerVerifyPayment(req, res);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
