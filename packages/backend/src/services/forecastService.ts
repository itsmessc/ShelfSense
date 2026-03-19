/**
 * Forecast Service — AI-powered stockout forecasting with rule-based fallback.
 */
import type { Pool } from 'mysql2/promise';
import type { ForecastResult } from '../types/index.js';
import { AiUnavailableError } from '../types/index.js';
import * as usageRepo from '../repositories/usageRepository.js';
import { getItemById } from './itemService.js';
import * as ai from './ai/aiOrchestrator.js';
import * as fallback from './fallbackService.js';

export async function generateForecast(
  pool: Pool,
  itemId: number,
): Promise<ForecastResult & { item_id: number }> {
  const item = await getItemById(pool, itemId);
  if (!item) throw new Error('Item not found');

  const logs = await usageRepo.findByItemRange(pool, 30);
  const itemLogs = logs.filter((l) => l.item_id === itemId);

  let forecast: ForecastResult;
  try {
    forecast = await ai.forecastStockout(item, itemLogs);
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      forecast = fallback.forecastStockout(item, itemLogs);
    } else {
      throw err;
    }
  }

  return { ...forecast, item_id: itemId };
}
