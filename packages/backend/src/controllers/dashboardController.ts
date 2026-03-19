import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connection.js';
import { getDashboardData } from '../services/dashboardService.js';

export async function getDashboard(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getDashboardData(getPool());
    res.json(data);
  } catch (err) { next(err); }
}
