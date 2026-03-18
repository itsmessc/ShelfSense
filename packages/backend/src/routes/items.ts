import { Router, type Request, type Response } from 'express';
import { getPool } from '../db/connection.js';
import * as svc from '../services/inventoryService.js';

const router = Router();

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

// GET /api/items
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category, low_stock, status, sort, order } = req.query;
    const items = await svc.listItems(getPool(), {
      search: search as string | undefined,
      category: category as string | undefined,
      low_stock: low_stock === 'true',
      status: status as 'critical' | 'warning' | 'normal' | undefined,
      sort: sort as string | undefined,
      order: order === 'desc' ? 'desc' : 'asc',
    });
    res.json({ data: items, total: items.length });
  } catch {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/items/export
router.get('/export', async (_req: Request, res: Response) => {
  try {
    const items = await svc.exportItems(getPool());
    res.setHeader('Content-Disposition', 'attachment; filename="shelfsense-export.json"');
    res.json({ exported_at: new Date().toISOString(), total: items.length, data: items });
  } catch {
    res.status(500).json({ error: 'Export failed' });
  }
});

// POST /api/items/import
router.post('/import', async (req: Request, res: Response) => {
  const rows = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'Request body must be a non-empty array of items' });
  }
  if (rows.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 items per import' });
  }

  try {
    const result = await svc.importItems(getPool(), rows);
    const status = result.errors.length > 0 && result.inserted === 0 ? 400 : 207;
    res.status(status).json(result);
  } catch {
    res.status(500).json({ error: 'Import failed' });
  }
});

// GET /api/items/:id
router.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const item = await svc.getItemById(getPool(), id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ data: item });
  } catch {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/items
router.post('/', async (req: Request, res: Response) => {
  const err = validateItemBody(req.body);
  if (err) return res.status(400).json({ error: err });

  try {
    const { name, quantity, unit, category, expiry_date, reorder_threshold,
            cost_per_unit, supplier, purchase_date } = req.body;
    const { item, ai_categorized } = await svc.createItem(getPool(), {
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
    res.status(201).json({ data: item, ai_categorized });
  } catch {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/items/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const err = validateItemBody(req.body, false);
  if (err) return res.status(400).json({ error: err });

  try {
    const updated = await svc.updateItem(getPool(), id, req.body);
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json({ data: updated });
  } catch {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/items/:id  (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const archived = await svc.deleteItem(getPool(), id);
    if (!archived) return res.status(404).json({ error: 'Item not found' });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
