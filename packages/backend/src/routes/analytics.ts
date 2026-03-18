import { Router, type Request, type Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { getPool } from '../db/connection.js';
import * as svc from '../services/inventoryService.js';

const router = Router();

// GET /api/analytics
router.get('/', async (_req: Request, res: Response) => {
  try {
    const pool = getPool();
    const all = await svc.listItems(pool, {});

    // Category breakdown
    const categoryMap = new Map<string, { count: number; total_value: number }>();
    for (const item of all) {
      const cat = item.category || 'Other';
      if (!categoryMap.has(cat)) categoryMap.set(cat, { count: 0, total_value: 0 });
      const entry = categoryMap.get(cat)!;
      entry.count += 1;
      entry.total_value += item.cost_per_unit != null
        ? Number(item.cost_per_unit) * Number(item.quantity)
        : 0;
    }
    const category_breakdown = Array.from(categoryMap.entries())
      .map(([category, { count, total_value }]) => ({
        category,
        count,
        total_value: Number(total_value.toFixed(2)),
      }))
      .sort((a, b) => b.count - a.count);

    // Inventory value
    const total_inventory_value = all.reduce((sum, i) =>
      sum + (i.cost_per_unit != null ? Number(i.cost_per_unit) * Number(i.quantity) : 0), 0
    );

    // Usage by day (last 30 days)
    const [usageRows] = await pool.execute<RowDataPacket[]>(`
      SELECT DATE(logged_at) AS day, SUM(quantity_used) AS total_used, COUNT(*) AS log_count
      FROM usage_logs
      WHERE logged_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(logged_at)
      ORDER BY day ASC
    `);

    // Top consumed items (last 30 days)
    const [topRows] = await pool.execute<RowDataPacket[]>(`
      SELECT ul.item_id, i.name, i.unit, i.category,
             SUM(ul.quantity_used) AS total_used,
             COUNT(ul.id) AS log_count
      FROM usage_logs ul
      JOIN items i ON i.id = ul.item_id
      WHERE ul.logged_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND i.is_archived = 0
      GROUP BY ul.item_id, i.name, i.unit, i.category
      ORDER BY total_used DESC
      LIMIT 8
    `);

    // Supplier count and eco coverage
    const suppliersWithItems = all.filter((i) => i.supplier).length;
    const itemsWithCost = all.filter((i) => i.cost_per_unit != null).length;
    const uniqueSuppliers = new Set(all.map((i) => i.supplier).filter(Boolean)).size;

    res.json({
      category_breakdown,
      total_inventory_value: Number(total_inventory_value.toFixed(2)),
      total_items: all.length,
      items_with_cost: itemsWithCost,
      items_with_supplier: suppliersWithItems,
      unique_suppliers: uniqueSuppliers,
      daily_usage: usageRows,
      top_consumed: topRows,
    });
  } catch {
    res.status(500).json({ error: 'Analytics failed' });
  }
});

export default router;
