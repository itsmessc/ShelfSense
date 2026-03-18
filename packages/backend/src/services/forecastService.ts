import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { UsageLog, ForecastResult } from '../types/index.js';
import { AiUnavailableError } from '../types/index.js';
import * as aiService from './aiService.js';
import * as fallback from './fallbackService.js';
import { getItemById } from './inventoryService.js';

export async function generateForecast(pool: Pool, itemId: number): Promise<ForecastResult & { item_id: number }> {
  const item = await getItemById(pool, itemId);
  if (!item) throw new Error('Item not found');

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM usage_logs
     WHERE item_id = ? AND logged_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     ORDER BY logged_at ASC`,
    [itemId]
  );
  const logs = rows as UsageLog[];

  let forecast: ForecastResult;
  try {
    forecast = await aiService.forecastStockout(item, logs);
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      forecast = fallback.forecastStockout(item, logs);
    } else {
      throw err;
    }
  }

  return { ...forecast, item_id: itemId };
}
