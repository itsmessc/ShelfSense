/**
 * Usage Service — business logic for usage logging and per-item forecasting.
 */
import type { Pool } from 'mysql2/promise';
import type { UsageLog, ForecastResult } from '../types/index.js';
import { AiUnavailableError } from '../types/index.js';
import * as usageRepo from '../repositories/usageRepository.js';
import * as batchRepo from '../repositories/batchRepository.js';
import { getItemById, syncItemTotals } from './itemService.js';
import * as ai from './ai/aiOrchestrator.js';
import * as fallback from './fallbackService.js';

export async function logUsage(
  pool: Pool,
  itemId: number,
  quantityUsed: number,
  notes?: string,
): Promise<{ log: UsageLog; updatedQuantity: number }> {
  // 1. Log the record
  const log = await usageRepo.insertLog(pool, itemId, quantityUsed, notes);
  
  // 2. Deduct from batches using FEFO (First Expired First Out)
  await batchRepo.deductFEFO(pool, itemId, quantityUsed);
  
  // 3. Sync the main item's total quantity and earliest expiry
  await syncItemTotals(pool, itemId);
  
  // 4. Return new total
  const item = await getItemById(pool, itemId);
  return { log, updatedQuantity: item ? Number(item.quantity) : 0 };
}

export async function getUsageHistory(
  pool: Pool,
  itemId: number,
): Promise<{ logs: UsageLog[]; average_daily_usage: number | null; forecast: ForecastResult }> {
  const logs = await usageRepo.findByItemId(pool, itemId);
  const item = await getItemById(pool, itemId);
  if (!item) {
    return { logs, average_daily_usage: null, forecast: fallback.buildForecastResult(null, 'low', false) };
  }

  let forecast: ForecastResult;
  try {
    forecast = await ai.forecastStockout(item, logs);
  } catch {
    forecast = fallback.forecastStockout(item, logs);
  }

  const totalUsed = logs.reduce((s, l) => s + Number(l.quantity_used), 0);
  const daySpan   = logs.length >= 2
    ? Math.max((new Date(logs[logs.length - 1].logged_at).getTime() - new Date(logs[0].logged_at).getTime()) / 86400000, 1)
    : 1;
  const average_daily_usage = logs.length ? Number((totalUsed / daySpan).toFixed(3)) : null;

  return { logs, average_daily_usage, forecast };
}

export async function getRecentLogs(pool: Pool, limit = 50) {
  return usageRepo.findRecent(pool, limit);
}
