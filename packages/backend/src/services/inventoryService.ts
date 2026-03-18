import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Item, UsageLog, ForecastResult } from '../types/index.js';
import { AiUnavailableError } from '../types/index.js';
import * as aiService from './aiService.js';
import * as fallback from './fallbackService.js';

// ── Items ─────────────────────────────────────────────────────────────────────

export async function listItems(
  pool: Pool,
  filters: { search?: string; category?: string; low_stock?: boolean }
): Promise<Item[]> {
  let sql = 'SELECT * FROM items WHERE 1=1';
  const params: unknown[] = [];

  if (filters.search) {
    sql += ' AND name LIKE ?';
    params.push(`%${filters.search}%`);
  }
  if (filters.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.low_stock) {
    sql += ' AND reorder_threshold > 0 AND quantity <= reorder_threshold';
  }

  sql += ' ORDER BY name ASC';
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows as Item[];
}

export async function getItemById(pool: Pool, id: number): Promise<Item | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM items WHERE id = ?',
    [id]
  );
  return rows.length ? (rows[0] as Item) : null;
}

export async function createItem(
  pool: Pool,
  payload: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days'>
): Promise<{ item: Item; ai_categorized: boolean }> {
  let category = payload.category;
  let ai_categorized = false;

  if (!category || category === 'Uncategorized') {
    try {
      category = await aiService.categorizeItem(payload.name, payload.unit);
      ai_categorized = true;
    } catch (err) {
      if (err instanceof AiUnavailableError) {
        category = fallback.categorizeItem(payload.name);
      } else {
        throw err;
      }
    }
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO items (name, quantity, unit, category, expiry_date, reorder_threshold)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [payload.name, payload.quantity, payload.unit, category, payload.expiry_date ?? null, payload.reorder_threshold]
  );

  const item = await getItemById(pool, result.insertId);
  return { item: item!, ai_categorized };
}

export async function updateItem(
  pool: Pool,
  id: number,
  patch: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days'>>
): Promise<Item | null> {
  const fields = Object.keys(patch) as Array<keyof typeof patch>;
  if (fields.length === 0) return getItemById(pool, id);

  const setClauses = fields.map((f) => `\`${f}\` = ?`).join(', ');
  const values = fields.map((f) => patch[f] ?? null);

  await pool.execute(
    `UPDATE items SET ${setClauses} WHERE id = ?`,
    [...values, id]
  );
  return getItemById(pool, id);
}

export async function deleteItem(pool: Pool, id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM items WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

// ── Usage Logs ────────────────────────────────────────────────────────────────

export async function logUsage(
  pool: Pool,
  itemId: number,
  quantityUsed: number,
  notes?: string
): Promise<{ log: UsageLog; updatedQuantity: number }> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO usage_logs (item_id, quantity_used, notes) VALUES (?, ?, ?)',
    [itemId, quantityUsed, notes ?? null]
  );

  // Deduct quantity (MySQL doesn't have triggers in this setup)
  await pool.execute(
    'UPDATE items SET quantity = GREATEST(0, quantity - ?) WHERE id = ?',
    [quantityUsed, itemId]
  );

  const [logRows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM usage_logs WHERE id = ?',
    [result.insertId]
  );
  const [itemRows] = await pool.execute<RowDataPacket[]>(
    'SELECT quantity FROM items WHERE id = ?',
    [itemId]
  );

  return {
    log: logRows[0] as UsageLog,
    updatedQuantity: Number((itemRows[0] as { quantity: number }).quantity),
  };
}

export async function getUsageLogs(pool: Pool, itemId: number): Promise<{
  logs: UsageLog[];
  average_daily_usage: number | null;
  forecast: ForecastResult;
}> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM usage_logs WHERE item_id = ? ORDER BY logged_at ASC',
    [itemId]
  );
  const logs = rows as UsageLog[];

  const item = await getItemById(pool, itemId);
  if (!item) return { logs, average_daily_usage: null, forecast: { days_until_stockout: null, confidence: 'low' } };

  // Try AI forecast, fall back to rule-based
  let forecast: ForecastResult;
  try {
    forecast = await aiService.forecastStockout(item, logs);
  } catch {
    forecast = fallback.forecastStockout(item, logs);
  }

  const totalUsed = logs.reduce((s, l) => s + Number(l.quantity_used), 0);
  const daySpan = logs.length >= 2
    ? Math.max((new Date(logs[logs.length - 1].logged_at).getTime() - new Date(logs[0].logged_at).getTime()) / 86400000, 1)
    : 1;
  const average_daily_usage = logs.length ? Number((totalUsed / daySpan).toFixed(3)) : null;

  return { logs, average_daily_usage, forecast };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboardData(pool: Pool) {
  const [allRows] = await pool.execute<RowDataPacket[]>('SELECT * FROM items');
  const all = allRows as Item[];

  const lowStock = all.filter(
    (i) => Number(i.reorder_threshold) > 0 && Number(i.quantity) <= Number(i.reorder_threshold)
  );

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const expiringSoon = all
    .filter((i) => i.expiry_date && i.expiry_date >= today && i.expiry_date <= in30)
    .map((i) => {
      const days = Math.round(
        (new Date(i.expiry_date!).getTime() - now.getTime()) / 86400000
      );
      return { ...i, days_until_expiry: days };
    })
    .sort((a, b) => a.days_until_expiry - b.days_until_expiry);

  const expiring7 = expiringSoon.filter((i) => i.expiry_date! <= in7).length;
  const expiring30 = expiringSoon.length;

  // Sustainability score
  const withFutureExpiry = all.filter((i) => !i.expiry_date || i.expiry_date >= today).length;
  const withThreshold = all.filter((i) => Number(i.reorder_threshold) > 0).length;
  const total = all.length || 1;

  const expiryRatio = withFutureExpiry / total;
  const reorderCoverage = withThreshold / total;
  const rawScore = expiryRatio * 50 + reorderCoverage * 50;
  const score = Math.round(rawScore);

  const label =
    score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';

  return {
    low_stock: lowStock,
    expiring_soon: expiringSoon,
    sustainability_score: {
      score,
      breakdown: {
        items_before_expiry_ratio: Number(expiryRatio.toFixed(2)),
        reorder_coverage: Number(reorderCoverage.toFixed(2)),
      },
      label,
    },
    totals: {
      item_count: total,
      low_stock_count: lowStock.length,
      expiring_within_7_days: expiring7,
      expiring_within_30_days: expiring30,
    },
  };
}
