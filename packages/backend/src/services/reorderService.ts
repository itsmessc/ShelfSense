/**
 * Reorder Service — smart reorder queue business logic.
 * Extracted from the route handler for clean separation of concerns.
 */
import type { Pool } from 'mysql2/promise';
import * as itemRepo  from '../repositories/itemRepository.js';
import * as usageRepo from '../repositories/usageRepository.js';
import { withAlertStatus } from './itemService.js';
import * as fallback from './fallbackService.js';
import type { UsageLog } from '../types/index.js';

export async function getReorderQueue(pool: Pool) {
  const raw  = await itemRepo.findAllActive(pool);
  const all  = raw.map(withAlertStatus);
  const logs = await usageRepo.findByItemRange(pool, 30);

  const logsByItem = new Map<number, UsageLog[]>();
  for (const row of logs) {
    if (!logsByItem.has(row.item_id)) logsByItem.set(row.item_id, []);
    logsByItem.get(row.item_id)!.push(row);
  }

  const reorderItems = all
    .filter((item) => item.alert_status === 'critical' || item.alert_status === 'warning')
    .map((item) => {
      const itemLogs     = logsByItem.get(item.id) ?? [];
      const forecast     = itemLogs.length >= 2 ? fallback.forecastStockout(item, itemLogs) : null;
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
      const order: Record<string, number> = { critical: 0, warning: 1, normal: 2 };
      const diff = (order[a.alert_status ?? 'normal'] ?? 2) - (order[b.alert_status ?? 'normal'] ?? 2);
      if (diff !== 0) return diff;
      if (a.days_until_stockout != null && b.days_until_stockout != null)
        return a.days_until_stockout - b.days_until_stockout;
      return 0;
    });

  const total_estimated_cost = Number(
    reorderItems.reduce((sum, i) => sum + (i.estimated_cost ?? 0), 0).toFixed(2),
  );

  return { items: reorderItems, total_estimated_cost };
}
