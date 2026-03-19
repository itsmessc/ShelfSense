import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connection.js';
import * as usageSvc from '../services/usageService.js';
import * as itemSvc  from '../services/itemService.js';
import { AppError } from '../middleware/errorHandler.js';
import * as auditRepo from '../repositories/auditRepository.js';

export async function getRecentLogs(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await usageSvc.getRecentLogs(getPool());
    res.json({ data });
  } catch (err) { next(err); }
}

export async function logUsage(req: Request, res: Response, next: NextFunction) {
  const { item_id, quantity_used, notes } = req.body;
  if (!item_id || isNaN(Number(item_id)))
    return next(new AppError(400, 'item_id is required and must be a number'));
  if (quantity_used === undefined || isNaN(Number(quantity_used)) || Number(quantity_used) <= 0)
    return next(new AppError(400, 'quantity_used must be a positive number'));
  try {
    const item = await itemSvc.getItemById(getPool(), Number(item_id));
    if (!item) return next(new AppError(404, 'Item not found'));
    const { log, updatedQuantity } = await usageSvc.logUsage(
      getPool(), Number(item_id), Number(quantity_used), notes,
    );
    await auditRepo.logAction(getPool(), 'usage', log.id, 'log_usage',
      `Used ${Number(quantity_used)} ${item.unit} of "${item.name}" (${updatedQuantity} remaining)`);
    res.status(201).json({ data: log, updated_item_quantity: updatedQuantity });
  } catch (err) { next(err); }
}

export async function getUsageHistory(req: Request, res: Response, next: NextFunction) {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) return next(new AppError(400, 'Invalid itemId'));
  try {
    const item = await itemSvc.getItemById(getPool(), itemId);
    if (!item) return next(new AppError(404, 'Item not found'));
    const result = await usageSvc.getUsageHistory(getPool(), itemId);
    res.json(result);
  } catch (err) { next(err); }
}

// POST /api/usage/batch
export async function batchLogUsage(req: Request, res: Response, next: NextFunction) {
  const entries = req.body;
  if (!Array.isArray(entries) || entries.length === 0)
    return next(new AppError(400, 'Body must be a non-empty array'));
  if (entries.length > 100)
    return next(new AppError(400, 'Maximum 100 entries per batch'));

  const pool   = getPool();
  let logged   = 0;
  const errors: Array<{ index: number; message: string }> = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] as { item_id?: unknown; quantity_used?: unknown; notes?: string };
    if (!e.item_id || isNaN(Number(e.item_id)))      { errors.push({ index: i, message: 'item_id required' }); continue; }
    if (!e.quantity_used || Number(e.quantity_used) <= 0) { errors.push({ index: i, message: 'quantity_used must be positive' }); continue; }

    const item = await itemSvc.getItemById(pool, Number(e.item_id));
    if (!item) { errors.push({ index: i, message: `Item ${e.item_id} not found` }); continue; }

    try {
      const { log, updatedQuantity } = await usageSvc.logUsage(pool, Number(e.item_id), Number(e.quantity_used), e.notes);
      await auditRepo.logAction(pool, 'usage', log.id, 'batch_usage',
        `Batch: used ${Number(e.quantity_used)} ${item.unit} of "${item.name}" (${updatedQuantity} remaining)`);
      logged++;
    } catch {
      errors.push({ index: i, message: 'Failed to log usage' });
    }
  }

  res.status(errors.length > 0 && logged === 0 ? 400 : 207).json({ logged, errors });
}
