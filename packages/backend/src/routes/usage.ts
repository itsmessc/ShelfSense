import { Router, type Request, type Response } from 'express';
import { getPool } from '../db/connection.js';
import * as svc from '../services/inventoryService.js';

const router = Router();

// POST /api/usage
router.post('/', async (req: Request, res: Response) => {
  const { item_id, quantity_used, notes } = req.body;

  if (!item_id || isNaN(Number(item_id))) {
    return res.status(400).json({ error: 'item_id is required and must be a number' });
  }
  if (quantity_used === undefined || isNaN(Number(quantity_used)) || Number(quantity_used) <= 0) {
    return res.status(400).json({ error: 'quantity_used must be a positive number' });
  }

  try {
    const item = await svc.getItemById(getPool(), Number(item_id));
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const { log, updatedQuantity } = await svc.logUsage(
      getPool(),
      Number(item_id),
      Number(quantity_used),
      notes
    );
    res.status(201).json({ data: log, updated_item_quantity: updatedQuantity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log usage' });
  }
});

// GET /api/usage/:itemId
router.get('/:itemId', async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) return res.status(400).json({ error: 'Invalid itemId' });

  try {
    const item = await svc.getItemById(getPool(), itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const result = await svc.getUsageLogs(getPool(), itemId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch usage logs' });
  }
});

export default router;
