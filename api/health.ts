import type { Request, Response } from 'express';

export default async function handler(_req: Request, res: Response) {
  return res.status(200).json({
    status: 'ok',
    service: 'EHABGM Pay Gateway',
    timestamp: new Date().toISOString(),
  });
}
