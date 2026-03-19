/**
 * Dashboard Service — aggregates inventory health metrics for the dashboard view.
 */
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { Item, ForecastResult } from '../types/index.js';
import * as itemRepo  from '../repositories/itemRepository.js';
import * as usageRepo from '../repositories/usageRepository.js';
import { withAlertStatus } from './itemService.js';
import * as fallback from './fallbackService.js';

export interface ForecastAlert {
  item_id: number;
  name: string;
  unit: string;
  days_until_stockout: number;
  predicted_burnout_date: string;
  recommended_reorder_date: string;
  confidence: ForecastResult['confidence'];
  ai_generated: boolean;
}

export async function getDashboardData(pool: Pool) {
  const raw = await itemRepo.findAllActive(pool);
  const all = raw.map(withAlertStatus);

  // Quick rule-based forecast alerts (last 30 days usage)
  const recentLogs = await usageRepo.findByItemRange(pool, 30);

  const logsByItem = new Map<number, typeof recentLogs>();
  for (const row of recentLogs) {
    if (!logsByItem.has(row.item_id)) logsByItem.set(row.item_id, []);
    logsByItem.get(row.item_id)!.push(row);
  }

  const forecastAlerts: ForecastAlert[] = [];
  for (const item of all) {
    const logs = logsByItem.get(item.id);
    if (!logs || logs.length < 2) continue;
    const fc = fallback.forecastStockout(item, logs);
    if (
      fc.days_until_stockout != null &&
      fc.days_until_stockout <= 14 &&
      fc.predicted_burnout_date != null &&
      fc.recommended_reorder_date != null
    ) {
      forecastAlerts.push({
        item_id: item.id,
        name: item.name,
        unit: item.unit,
        days_until_stockout: fc.days_until_stockout,
        predicted_burnout_date: fc.predicted_burnout_date,
        recommended_reorder_date: fc.recommended_reorder_date,
        confidence: fc.confidence,
        ai_generated: false,
      });
    }
  }
  forecastAlerts.sort((a, b) => a.days_until_stockout - b.days_until_stockout);

  const now   = new Date();
  const in30  = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const in7   = new Date(now.getTime() +  7 * 86400000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const lowStock      = all.filter((i) => i.alert_status === 'critical' && Number(i.reorder_threshold) > 0);
  const criticalItems = all.filter((i) => i.alert_status === 'critical');
  const warningItems  = all.filter((i) => i.alert_status === 'warning');

  const expiringSoon = all
    .filter((i) => i.expiry_date && i.expiry_date >= today && i.expiry_date <= in30)
    .map((i) => ({
      ...i,
      days_until_expiry: Math.round((new Date(i.expiry_date!).getTime() - now.getTime()) / 86400000),
    }))
    .sort((a, b) => a.days_until_expiry - b.days_until_expiry);

  // Sustainability score — 4 dimensions
  const total           = all.length || 1;
  const withFutureExpiry = all.filter((i) => !i.expiry_date || i.expiry_date >= today).length;
  const withThreshold   = all.filter((i) => Number(i.reorder_threshold) > 0).length;
  const withCost        = all.filter((i) => i.cost_per_unit != null).length;
  const supplierSet     = new Set(all.map((i) => i.supplier).filter(Boolean));

  const wasteReduction   = Math.round((withFutureExpiry / total) * 100);
  const reorderCoverage  = Math.round((withThreshold / total) * 100);
  const costTracking     = Math.round((withCost / total) * 100);
  const supplierDiversity = Math.min(100, Math.round((supplierSet.size / Math.max(total * 0.3, 1)) * 100));

  const rawScore = wasteReduction * 0.4 + reorderCoverage * 0.3 + supplierDiversity * 0.2 + costTracking * 0.1;
  const score    = Math.round(rawScore);
  const grade    = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';
  const label    = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';

  return {
    low_stock: lowStock,
    expiring_soon: expiringSoon,
    forecast_alerts: forecastAlerts,
    sustainability_score: {
      score, grade, label,
      breakdown: { waste_reduction: wasteReduction, reorder_coverage: reorderCoverage, supplier_diversity: supplierDiversity, cost_tracking: costTracking },
    },
    totals: {
      item_count: all.length,
      low_stock_count: lowStock.length,
      expiring_within_7_days: expiringSoon.filter((i) => i.expiry_date! <= in7).length,
      expiring_within_30_days: expiringSoon.length,
      critical_count: criticalItems.length,
      warning_count: warningItems.length,
    },
    co2_saved_kg: Number((withFutureExpiry * 0.12).toFixed(2)),
    waste_prevented_items: withFutureExpiry,
  };
}
