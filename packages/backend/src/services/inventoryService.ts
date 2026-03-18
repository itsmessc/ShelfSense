import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Item, UsageLog, ForecastResult, AlertStatus } from '../types/index.js';
import { AiUnavailableError } from '../types/index.js';
import * as aiService from './aiService.js';
import * as fallback from './fallbackService.js';

// ── Alert status computation ──────────────────────────────────────────────────

export function computeAlertStatus(item: Item): AlertStatus {
  const today = new Date();
  const qty = Number(item.quantity);
  const threshold = Number(item.reorder_threshold);

  // Expiry-based urgency
  if (item.expiry_date) {
    const daysUntil = Math.round(
      (new Date(item.expiry_date).getTime() - today.getTime()) / 86400000
    );
    if (daysUntil <= 3) return 'critical';
    if (daysUntil <= 7) return 'warning';
  }

  // Stock-based urgency
  if (threshold > 0) {
    if (qty <= threshold) return 'critical';
    if (qty <= threshold * 1.5) return 'warning';
  }

  return 'normal';
}

function withAlertStatus(item: Item): Item {
  return { ...item, alert_status: computeAlertStatus(item) };
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function listItems(
  pool: Pool,
  filters: {
    search?: string;
    category?: string;
    low_stock?: boolean;
    status?: AlertStatus;
    sort?: string;
    order?: 'asc' | 'desc';
  }
): Promise<Item[]> {
  let sql = 'SELECT * FROM items WHERE is_archived = 0';
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

  // Sorting
  const sortableColumns: Record<string, string> = {
    name: 'name', quantity: 'quantity',
    expiry_date: 'expiry_date', created_at: 'created_at',
  };
  const sortCol = sortableColumns[filters.sort ?? ''] ?? 'name';
  const sortDir = filters.order === 'desc' ? 'DESC' : 'ASC';
  sql += ` ORDER BY ${sortCol} ${sortDir}`;

  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  let items = (rows as Item[]).map(withAlertStatus);

  // Status filter applied after computing alert_status
  if (filters.status) {
    items = items.filter((i) => i.alert_status === filters.status);
  }

  return items;
}

export async function getItemById(pool: Pool, id: number): Promise<Item | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM items WHERE id = ? AND is_archived = 0',
    [id]
  );
  return rows.length ? withAlertStatus(rows[0] as Item) : null;
}

export async function createItem(
  pool: Pool,
  payload: Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days' | 'alert_status' | 'is_archived'>
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
    `INSERT INTO items (name, quantity, unit, category, expiry_date, reorder_threshold,
                        cost_per_unit, supplier, purchase_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [payload.name, payload.quantity, payload.unit, category,
     payload.expiry_date ?? null, payload.reorder_threshold,
     payload.cost_per_unit ?? null, payload.supplier ?? null, payload.purchase_date ?? null]
  );

  const item = await getItemById(pool, result.insertId);
  return { item: item!, ai_categorized };
}

export async function updateItem(
  pool: Pool,
  id: number,
  patch: Partial<Omit<Item, 'id' | 'created_at' | 'updated_at' | 'forecast_days' | 'alert_status' | 'is_archived'>>
): Promise<Item | null> {
  const allowed = ['name','quantity','unit','category','expiry_date','reorder_threshold',
                   'cost_per_unit','supplier','purchase_date'];
  const fields = Object.keys(patch).filter((k) => allowed.includes(k));
  if (fields.length === 0) return getItemById(pool, id);

  const setClauses = fields.map((f) => `\`${f}\` = ?`).join(', ');
  const values = fields.map((f) => (patch as Record<string, unknown>)[f] ?? null);

  await pool.execute(
    `UPDATE items SET ${setClauses} WHERE id = ? AND is_archived = 0`,
    [...values, id]
  );
  return getItemById(pool, id);
}

/** Soft delete — sets is_archived = 1 */
export async function deleteItem(pool: Pool, id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE items SET is_archived = 1 WHERE id = ? AND is_archived = 0',
    [id]
  );
  return result.affectedRows > 0;
}

// ── CSV / JSON import & export ────────────────────────────────────────────────

export async function importItems(
  pool: Pool,
  rows: Array<Partial<Item>>
): Promise<{ inserted: number; errors: Array<{ row: number; message: string }> }> {
  let inserted = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.name?.trim()) { errors.push({ row: i + 1, message: 'name is required' }); continue; }
    if (row.quantity === undefined || isNaN(Number(row.quantity))) { errors.push({ row: i + 1, message: 'quantity must be a number' }); continue; }
    if (!row.unit?.trim()) { errors.push({ row: i + 1, message: 'unit is required' }); continue; }

    let category = row.category ?? 'Uncategorized';
    if (!category || category === 'Uncategorized') {
      try { category = await aiService.categorizeItem(row.name, row.unit); }
      catch { category = fallback.categorizeItem(row.name); }
    }

    try {
      await pool.execute(
        `INSERT INTO items (name, quantity, unit, category, expiry_date, reorder_threshold,
                            cost_per_unit, supplier, purchase_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.name.trim(), Number(row.quantity), row.unit.trim(), category,
         row.expiry_date ?? null, Number(row.reorder_threshold ?? 0),
         row.cost_per_unit ? Number(row.cost_per_unit) : null,
         row.supplier ?? null, row.purchase_date ?? null]
      );
      inserted++;
    } catch (e) {
      errors.push({ row: i + 1, message: (e as Error).message });
    }
  }

  return { inserted, errors };
}

export async function exportItems(pool: Pool): Promise<Item[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM items WHERE is_archived = 0 ORDER BY name ASC'
  );
  return (rows as Item[]).map(withAlertStatus);
}

// ── Usage Logs ────────────────────────────────────────────────────────────────

export async function logUsage(
  pool: Pool, itemId: number, quantityUsed: number, notes?: string
): Promise<{ log: UsageLog; updatedQuantity: number }> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO usage_logs (item_id, quantity_used, notes) VALUES (?, ?, ?)',
    [itemId, quantityUsed, notes ?? null]
  );

  await pool.execute(
    'UPDATE items SET quantity = GREATEST(0, quantity - ?) WHERE id = ?',
    [quantityUsed, itemId]
  );

  const [logRows] = await pool.execute<RowDataPacket[]>('SELECT * FROM usage_logs WHERE id = ?', [result.insertId]);
  const [itemRows] = await pool.execute<RowDataPacket[]>('SELECT quantity FROM items WHERE id = ?', [itemId]);

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
  if (!item) return { logs, average_daily_usage: null, forecast: fallback.buildForecastResult(null, 'low', false) };

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
  const [allRows] = await pool.execute<RowDataPacket[]>('SELECT * FROM items WHERE is_archived = 0');
  const all = (allRows as Item[]).map(withAlertStatus);

  const lowStock = all.filter((i) => i.alert_status === 'critical' && Number(i.reorder_threshold) > 0);
  const criticalItems = all.filter((i) => i.alert_status === 'critical');
  const warningItems = all.filter((i) => i.alert_status === 'warning');

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const in7 = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const expiringSoon = all
    .filter((i) => i.expiry_date && i.expiry_date >= today && i.expiry_date <= in30)
    .map((i) => ({
      ...i,
      days_until_expiry: Math.round((new Date(i.expiry_date!).getTime() - now.getTime()) / 86400000),
    }))
    .sort((a, b) => a.days_until_expiry - b.days_until_expiry);

  const total = all.length || 1;

  // Sustainability score — 4 dimensions
  const withFutureExpiry = all.filter((i) => !i.expiry_date || i.expiry_date >= today).length;
  const withThreshold = all.filter((i) => Number(i.reorder_threshold) > 0).length;
  const withCost = all.filter((i) => i.cost_per_unit != null).length;
  const supplierSet = new Set(all.map((i) => i.supplier).filter(Boolean));

  const wasteReduction = Math.round((withFutureExpiry / total) * 100);
  const reorderCoverage = Math.round((withThreshold / total) * 100);
  const costTracking = Math.round((withCost / total) * 100);
  const supplierDiversity = Math.min(100, Math.round((supplierSet.size / Math.max(total * 0.3, 1)) * 100));

  const rawScore = wasteReduction * 0.4 + reorderCoverage * 0.3 + supplierDiversity * 0.2 + costTracking * 0.1;
  const score = Math.round(rawScore);
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';

  // CO₂ and waste estimates
  const co2_saved_kg = Number((withFutureExpiry * 0.12).toFixed(2));
  const waste_prevented_items = withFutureExpiry;

  return {
    low_stock: lowStock,
    expiring_soon: expiringSoon,
    sustainability_score: {
      score,
      grade,
      breakdown: {
        waste_reduction: wasteReduction,
        reorder_coverage: reorderCoverage,
        supplier_diversity: supplierDiversity,
        cost_tracking: costTracking,
      },
      label,
    },
    totals: {
      item_count: all.length,
      low_stock_count: lowStock.length,
      expiring_within_7_days: expiringSoon.filter((i) => i.expiry_date! <= in7).length,
      expiring_within_30_days: expiringSoon.length,
      critical_count: criticalItems.length,
      warning_count: warningItems.length,
    },
    co2_saved_kg,
    waste_prevented_items,
  };
}
