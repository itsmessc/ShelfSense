import { Router, type Request, type Response } from 'express';
import { getPool } from '../db/connection.js';
import { generateForecast } from '../services/forecastService.js';

const router = Router();

// POST /api/forecasts/generate
router.post('/generate', async (req: Request, res: Response) => {
  const { item_id } = req.body;
  if (!item_id || isNaN(Number(item_id))) {
    return res.status(400).json({ error: 'item_id is required and must be a number' });
  }

  try {
    const forecast = await generateForecast(getPool(), Number(item_id));
    res.json({ data: forecast });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'Item not found') return res.status(404).json({ error: msg });
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

export default router;
