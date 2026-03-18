import { Router, type Request, type Response } from 'express';
import { getPool } from '../db/connection.js';
import { getDashboardData } from '../services/inventoryService.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await getDashboardData(getPool());
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
