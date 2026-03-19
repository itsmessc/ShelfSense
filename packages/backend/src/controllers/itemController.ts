import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connection.js';
import * as itemSvc from '../services/itemService.js';
import * as ai from '../services/ai/aiOrchestrator.js';
import { AiUnavailableError } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';
import * as auditRepo from '../repositories/auditRepository.js';

function validateItemBody(body: Record<string, unknown>, requireFields = true): string | null {
  if (requireFields && (!body.name || typeof body.name !== 'string' || !String(body.name).trim()))
    return 'name is required';
  if (requireFields && (body.quantity === undefined || body.quantity === null))
    return 'quantity is required';
  if (body.quantity !== undefined && (isNaN(Number(body.quantity)) || Number(body.quantity) < 0))
    return 'quantity must be a non-negative number';
  if (requireFields && (!body.unit || typeof body.unit !== 'string' || !String(body.unit).trim()))
    return 'unit is required';
  if (body.expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.expiry_date)))
    return 'expiry_date must be YYYY-MM-DD';
  if (body.purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.purchase_date)))
    return 'purchase_date must be YYYY-MM-DD';
  if (body.reorder_threshold !== undefined && isNaN(Number(body.reorder_threshold)))
    return 'reorder_threshold must be a number';
  if (body.cost_per_unit !== undefined && body.cost_per_unit !== null && isNaN(Number(body.cost_per_unit)))
    return 'cost_per_unit must be a number';
  return null;
}

export async function listItems(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, category, low_stock, status, sort, order } = req.query;
    const items = await itemSvc.listItems(getPool(), {
      search:    search as string | undefined,
      category:  category as string | undefined,
      low_stock: low_stock === 'true',
      status:    status as 'critical' | 'warning' | 'normal' | undefined,
      sort:      sort as string | undefined,
      order:     order === 'desc' ? 'desc' : 'asc',
    });
    res.json({ data: items, total: items.length });
  } catch (err) { next(err); }
}

export async function getItem(req: Request, res: Response, next: NextFunction) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return next(new AppError(400, 'Invalid id'));
  try {
    const item = await itemSvc.getItemById(getPool(), id);
    if (!item) return next(new AppError(404, 'Item not found'));
    res.json({ data: item });
  } catch (err) { next(err); }
}

export async function createItem(req: Request, res: Response, next: NextFunction) {
  const err = validateItemBody(req.body);
  if (err) return next(new AppError(400, err));
  try {
    const { name, quantity, unit, category, expiry_date, reorder_threshold,
            cost_per_unit, supplier, purchase_date } = req.body;
    const result = await itemSvc.createItem(getPool(), {
      name: String(name).trim(),
      quantity: Number(quantity),
      unit: String(unit).trim(),
      category: category ?? 'Uncategorized',
      expiry_date: expiry_date ?? null,
      reorder_threshold: Number(reorder_threshold ?? 0),
      cost_per_unit: cost_per_unit != null ? Number(cost_per_unit) : null,
      supplier: supplier ? String(supplier).trim() : null,
      purchase_date: purchase_date ?? null,
    });
    await auditRepo.logAction(getPool(), 'item', result.item!.id, 'create', `Added "${result.item!.name}" (${result.item!.quantity} ${result.item!.unit})`);
    res.status(201).json({ data: result.item, ai_categorized: result.ai_categorized });
  } catch (err) { next(err); }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return next(new AppError(400, 'Invalid id'));
  const err = validateItemBody(req.body, false);
  if (err) return next(new AppError(400, err));
  try {
    const updated = await itemSvc.updateItem(getPool(), id, req.body);
    if (!updated) return next(new AppError(404, 'Item not found'));
    await auditRepo.logAction(getPool(), 'item', id, 'update', `Updated "${updated.name}"`);
    res.json({ data: updated });
  } catch (err) { next(err); }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return next(new AppError(400, 'Invalid id'));
  try {
    const item = await itemSvc.getItemById(getPool(), id);
    const archived = await itemSvc.deleteItem(getPool(), id);
    if (!archived) return next(new AppError(404, 'Item not found'));
    await auditRepo.logAction(getPool(), 'item', id, 'delete', `Archived "${item?.name ?? id}"`);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function exportItems(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await itemSvc.exportItems(getPool());
    await auditRepo.logAction(getPool(), 'export', null, 'export', `Exported ${items.length} items`);
    res.setHeader('Content-Disposition', 'attachment; filename="shelfsense-export.json"');
    res.json({ exported_at: new Date().toISOString(), total: items.length, data: items });
  } catch (err) { next(err); }
}

export async function importItems(req: Request, res: Response, next: NextFunction) {
  const rows = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return next(new AppError(400, 'Request body must be a non-empty array of items'));
  if (rows.length > 500)
    return next(new AppError(400, 'Maximum 500 items per import'));
  try {
    const result = await itemSvc.importItems(getPool(), rows);
    if (result.inserted > 0) {
      await auditRepo.logAction(getPool(), 'import', null, 'import', `Imported ${result.inserted} items via CSV/JSON`);
    }
    const status = result.errors.length > 0 && result.inserted === 0 ? 400 : 207;
    res.status(status).json(result);
  } catch (err) { next(err); }
}

export async function scanShelf(req: Request, res: Response, next: NextFunction) {
  const { image, mimeType } = req.body as { image?: string; mimeType?: string };
  if (!image || typeof image !== 'string')
    return next(new AppError(400, 'image (base64 string) is required'));
  try {
    const items = await ai.scanShelfImage(image, mimeType ?? 'image/jpeg');
    res.json({ items, ai_generated: true });
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return res.status(503).json({ error: 'AI vision unavailable', items: [], ai_generated: false });
    }
    next(err);
  }
}

// GET /api/items/expiry-calendar?year=2025&month=3
export async function getExpiryCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const year  = parseInt(String(req.query.year  ?? new Date().getFullYear()));
    const month = parseInt(String(req.query.month ?? new Date().getMonth() + 1));
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12)
      return next(new AppError(400, 'Valid year and month (1-12) are required'));

    const pad = (n: number) => String(n).padStart(2, '0');
    const prefix = `${year}-${pad(month)}-`;

    const [batches] = await getPool().execute<import('mysql2/promise').RowDataPacket[]>(
      `SELECT b.*, i.name, i.unit, i.category 
       FROM item_batches b
       JOIN items i ON i.id = b.item_id
       WHERE i.is_archived = 0 AND b.quantity > 0 AND b.expiry_date LIKE ?`,
      [`${prefix}%`]
    );

    const itemsByDate: Record<string, any[]> = {};
    for (const b of batches) {
      const dateStr = b.expiry_date instanceof Date
        ? b.expiry_date.toISOString().slice(0, 10)
        : String(b.expiry_date).slice(0, 10);
      
      if (!itemsByDate[dateStr]) itemsByDate[dateStr] = [];
      itemsByDate[dateStr].push({
        id: b.item_id,
        batch_id: b.id,
        name: b.name,
        quantity: b.quantity,
        unit: b.unit,
        category: b.category,
        expiry_date: dateStr
      });
    }

    const [allCount] = await getPool().execute<import('mysql2/promise').RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM item_batches WHERE expiry_date < CURDATE() AND quantity > 0'
    );
    const expired = (allCount[0] as any).total;
    const thisMonth = Object.values(itemsByDate).flat().length;

    res.json({ items_by_date: itemsByDate, summary: { this_month: thisMonth, expired_total: expired } });
  } catch (err) { next(err); }
}
