import { Router, type Request, type Response } from 'express';
import { getPool } from '../db/connection.js';
import * as svc from '../services/inventoryService.js';

const router = Router();

function validateItemBody(body: Record<string, unknown>): string | null {
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return 'name is required';
  }
  if (body.quantity === undefined || body.quantity === null) {
    return 'quantity is required';
  }
  if (isNaN(Number(body.quantity)) || Number(body.quantity) < 0) {
    return 'quantity must be a non-negative number';
  }
  if (!body.unit || typeof body.unit !== 'string' || !body.unit.trim()) {
    return 'unit is required';
  }
  if (body.expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.expiry_date))) {
    return 'expiry_date must be in YYYY-MM-DD format';
  }
  if (body.reorder_threshold !== undefined && isNaN(Number(body.reorder_threshold))) {
    return 'reorder_threshold must be a number';
  }
  return null;
}

// GET /api/items
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category, low_stock } = req.query;
    const items = await svc.listItems(getPool(), {
      search: search as string | undefined,
      category: category as string | undefined,
      low_stock: low_stock === 'true',
    });
    res.json({ data: items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/items/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const item = await svc.getItemById(getPool(), id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ data: item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/items
router.post('/', async (req: Request, res: Response) => {
  const validationError = validateItemBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const { name, quantity, unit, category, expiry_date, reorder_threshold } = req.body;
    const { item, ai_categorized } = await svc.createItem(getPool(), {
      name: name.trim(),
      quantity: Number(quantity),
      unit: unit.trim(),
      category: category ?? 'Uncategorized',
      expiry_date: expiry_date ?? null,
      reorder_threshold: Number(reorder_threshold ?? 0),
    });
    res.status(201).json({ data: item, ai_categorized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/items/:id
router.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const body = req.body as Record<string, unknown>;
  const allowed = ['name', 'quantity', 'unit', 'category', 'expiry_date', 'reorder_threshold'];
  const patch: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (patch.quantity !== undefined && isNaN(Number(patch.quantity))) {
    return res.status(400).json({ error: 'quantity must be a number' });
  }

  try {
    const updated = await svc.updateItem(getPool(), id, patch as Parameters<typeof svc.updateItem>[2]);
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/items/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  try {
    const deleted = await svc.deleteItem(getPool(), id);
    if (!deleted) return res.status(404).json({ error: 'Item not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
