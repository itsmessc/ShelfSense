import { Router, type Request, type Response } from 'express';
import { getPool } from '../db/connection.js';
import { getSupplierSuggestions } from '../services/procurementService.js';

const router = Router();

// GET /api/procurement/suggestions?itemId=xxx
router.get('/suggestions', async (req: Request, res: Response) => {
  const itemId = parseInt(String(req.query.itemId));
  if (isNaN(itemId)) return res.status(400).json({ error: 'itemId query param is required' });

  try {
    const result = await getSupplierSuggestions(getPool(), itemId);
    res.json(result);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'Item not found') return res.status(404).json({ error: msg });
    res.status(500).json({ error: 'Failed to fetch supplier suggestions' });
  }
});

export default router;
