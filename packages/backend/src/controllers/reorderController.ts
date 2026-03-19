import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connection.js';
import { getReorderQueue } from '../services/reorderService.js';

export async function getQueue(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getReorderQueue(getPool());
    res.json(data);
  } catch (err) { next(err); }
}
