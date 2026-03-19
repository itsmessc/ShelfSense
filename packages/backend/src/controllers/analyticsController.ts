import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connection.js';
import { getAnalytics } from '../services/analyticsService.js';

export async function getAnalyticsData(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getAnalytics(getPool());
    res.json(data);
  } catch (err) { next(err); }
}
