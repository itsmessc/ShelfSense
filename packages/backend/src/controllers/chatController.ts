import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connection.js';
import { AiUnavailableError } from '../types/index.js';
import * as ai from '../services/ai/aiOrchestrator.js';
import { getDashboardData } from '../services/dashboardService.js';
import { listItems } from '../services/itemService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function chat(req: Request, res: Response, next: NextFunction) {
  const { message } = req.body as { message?: string };
  if (!message || typeof message !== 'string' || !message.trim())
    return next(new AppError(400, 'message is required'));
  try {
    const pool      = getPool();
    const dashboard = await getDashboardData(pool);
    const allItems  = await listItems(pool, {});

    const reply = await ai.chatWithInventory(message.trim(), {
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
        reply: "I'm currently in offline mode. Check the Dashboard for critical stock alerts, the Inventory page to manage items, and the Procurement Hub for eco-friendly supplier suggestions.",
        ai_generated: false,
      });
    }
    next(err);
  }
}
