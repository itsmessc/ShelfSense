import { Router, type Request, type Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { getPool } from '../db/connection.js';
import * as svc from '../services/inventoryService.js';
import * as fallback from '../services/fallbackService.js';

const router = Router();

// GET /api/reorder — smart reorder queue
router.get('/', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const all = await svc.listItems(pool, {});

    // Fetch usage logs for last 30 days
    const [logRows] = await pool.execute<RowDataPacket[]>(`
      SELECT item_id, quantity_used, logged_at
      FROM usage_logs
      WHERE logged_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY item_id, logged_at ASC
    `);

    const logsByItem = new Map<number, Array<{ item_id: number; quantity_used: number; logged_at: string }>>();
    for (const row of logRows as Array<{ item_id: number; quantity_used: number; logged_at: string }>) {
      if (!logsByItem.has(row.item_id)) logsByItem.set(row.item_id, []);
      logsByItem.get(row.item_id)!.push(row);
    }

    const reorderItems = all
      .filter((item) => item.alert_status === 'critical' || item.alert_status === 'warning')
      .map((item) => {
        const logs = logsByItem.get(item.id) ?? [];
        const fullLogs = logs.map((l) => ({ id: 0, notes: null, ...l }));
        const forecast = fullLogs.length >= 2 ? fallback.forecastStockout(item, fullLogs) : null;
        const suggestedQty = forecast?.recommended_reorder_quantity
          ?? (Number(item.reorder_threshold) > 0 ? Number(item.reorder_threshold) * 2 : null);
        const estimatedCost =
          suggestedQty != null && item.cost_per_unit != null
            ? Number((suggestedQty * Number(item.cost_per_unit)).toFixed(2))
            : null;

        return {
          id: item.id,
          name: item.name,
          unit: item.unit,
          category: item.category,
          current_quantity: Number(item.quantity),
          reorder_threshold: Number(item.reorder_threshold),
          alert_status: item.alert_status,
          suggested_order_qty: suggestedQty,
          estimated_cost: estimatedCost,
          cost_per_unit: item.cost_per_unit ? Number(item.cost_per_unit) : null,
          supplier: item.supplier,
          days_until_stockout: forecast?.days_until_stockout ?? null,
          reorder_date: forecast?.recommended_reorder_date ?? null,
        };
      })
      .sort((a, b) => {
        const order = { critical: 0, warning: 1, normal: 2 };
        const statusDiff = (order[a.alert_status ?? 'normal'] ?? 2) - (order[b.alert_status ?? 'normal'] ?? 2);
        if (statusDiff !== 0) return statusDiff;
        if (a.days_until_stockout != null && b.days_until_stockout != null)
          return a.days_until_stockout - b.days_until_stockout;
        return 0;
      });

    const totalEstimatedCost = reorderItems
      .reduce((sum, i) => sum + (i.estimated_cost ?? 0), 0)
      .toFixed(2);

    res.json({ items: reorderItems, total_estimated_cost: Number(totalEstimatedCost) });
  } catch {
    res.status(500).json({ error: 'Failed to generate reorder queue' });
  }
});

export default router;
