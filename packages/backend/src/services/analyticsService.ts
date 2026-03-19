/**
 * Analytics Service — inventory KPI computation.
 * Extracted from the route handler for clean separation of concerns.
 */
import type { Pool } from 'mysql2/promise';
import * as itemRepo  from '../repositories/itemRepository.js';
import * as usageRepo from '../repositories/usageRepository.js';
import { withAlertStatus } from './itemService.js';

export async function getAnalytics(pool: Pool) {
  const raw  = await itemRepo.findAllActive(pool);
  const all  = raw.map(withAlertStatus);

  // Category breakdown
  const categoryMap = new Map<string, { count: number; total_value: number }>();
  for (const item of all) {
    const cat = item.category || 'Other';
    if (!categoryMap.has(cat)) categoryMap.set(cat, { count: 0, total_value: 0 });
    const entry = categoryMap.get(cat)!;
    entry.count       += 1;
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

  const total_inventory_value = all.reduce(
    (sum, i) => sum + (i.cost_per_unit != null ? Number(i.cost_per_unit) * Number(i.quantity) : 0),
    0,
  );

  const daily_usage  = await usageRepo.getDailyStats(pool, 30);
  const top_consumed = await usageRepo.getTopConsumed(pool, 30, 8);

  const suppliersWithItems = all.filter((i) => i.supplier).length;
  const itemsWithCost      = all.filter((i) => i.cost_per_unit != null).length;
  const uniqueSuppliers    = new Set(all.map((i) => i.supplier).filter(Boolean)).size;

  return {
    category_breakdown,
    total_inventory_value: Number(total_inventory_value.toFixed(2)),
    total_items: all.length,
    items_with_cost: itemsWithCost,
    items_with_supplier: suppliersWithItems,
    unique_suppliers: uniqueSuppliers,
    daily_usage,
    top_consumed,
  };
}
