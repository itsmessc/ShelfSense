import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connection.js';
import { generateForecast } from '../services/forecastService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function generate(req: Request, res: Response, next: NextFunction) {
  const { item_id } = req.body;
  if (!item_id || isNaN(Number(item_id)))
    return next(new AppError(400, 'item_id is required and must be a number'));
  try {
    const forecast = await generateForecast(getPool(), Number(item_id));
    res.json({ data: forecast });
  } catch (err) {
    if ((err as Error).message === 'Item not found') return next(new AppError(404, 'Item not found'));
    next(err);
  }
}
