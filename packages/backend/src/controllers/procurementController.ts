import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connection.js';
import { getSupplierSuggestions } from '../services/procurementService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getSuggestions(req: Request, res: Response, next: NextFunction) {
  const itemId = parseInt(String(req.query.itemId));
  if (isNaN(itemId)) return next(new AppError(400, 'itemId query param is required'));
  try {
    const result = await getSupplierSuggestions(getPool(), itemId);
    res.json(result);
  } catch (err) {
    if ((err as Error).message === 'Item not found') return next(new AppError(404, 'Item not found'));
    next(err);
  }
}
