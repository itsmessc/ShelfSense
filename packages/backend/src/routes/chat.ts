import { Router, type Request, type Response } from 'express';
import { getPool } from '../db/connection.js';
import * as svc from '../services/inventoryService.js';
import * as aiService from '../services/aiService.js';
import { AiUnavailableError } from '../types/index.js';

const router = Router();

// POST /api/chat
router.post('/', async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const pool = getPool();
    const dashboard = await svc.getDashboardData(pool);
    const items = dashboard.low_stock
      .concat(
        (await svc.listItems(pool, {})).filter(
          (i) => !dashboard.low_stock.find((l) => l.id === i.id)
        )
      );
    const allItems = await svc.listItems(pool, {});

    const reply = await aiService.chatWithInventory(message.trim(), {
      items: allItems.map((i) => ({
        name: i.name,
        quantity: Number(i.quantity),
        unit: i.unit,
        category: i.category,
        alert_status: i.alert_status,
        expiry_date: i.expiry_date,
        cost_per_unit: i.cost_per_unit ? Number(i.cost_per_unit) : null,
        reorder_threshold: Number(i.reorder_threshold),
      })),
      totals: dashboard.totals,
      forecast_alerts: dashboard.forecast_alerts,
    });

    res.json({ reply, ai_generated: true });
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      return res.json({
        reply: "I'm currently in offline mode. Here's what I know: check the Dashboard for critical stock alerts, the Inventory page to manage items, and the Procurement Hub for eco-friendly supplier suggestions.",
        ai_generated: false,
      });
    }
    res.status(500).json({ error: 'Chat failed' });
  }
});

export default router;
