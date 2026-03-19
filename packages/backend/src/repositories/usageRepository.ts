/**
 * Usage Repository — Data Access Layer.
 * Only raw SQL queries. Zero business logic.
 */
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { UsageLog } from '../types/index.js';

export interface RecentLog extends UsageLog {
  item_name: string;
  unit: string;
}

export async function insertLog(
  pool: Pool,
  itemId: number,
  quantityUsed: number,
  notes?: string,
): Promise<UsageLog> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO usage_logs (item_id, quantity_used, notes) VALUES (?, ?, ?)',
    [itemId, quantityUsed, notes ?? null],
  );
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM usage_logs WHERE id = ?',
    [result.insertId],
  );
  return rows[0] as UsageLog;
}

export async function decrementItemQty(
  pool: Pool,
  itemId: number,
  quantity: number,
): Promise<number> {
  await pool.execute(
    'UPDATE items SET quantity = GREATEST(0, quantity - ?) WHERE id = ?',
    [quantity, itemId],
  );
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT quantity FROM items WHERE id = ?',
    [itemId],
  );
  return Number((rows[0] as { quantity: number }).quantity);
}

export async function findByItemId(pool: Pool, itemId: number): Promise<UsageLog[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM usage_logs WHERE item_id = ? ORDER BY logged_at ASC',
    [itemId],
  );
  return rows as UsageLog[];
}

export async function findRecent(pool: Pool, limit = 50): Promise<RecentLog[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ul.id, ul.item_id, ul.quantity_used, ul.logged_at, ul.notes,
            i.name AS item_name, i.unit
     FROM usage_logs ul
     JOIN items i ON i.id = ul.item_id
     WHERE i.is_archived = 0
     ORDER BY ul.logged_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows as RecentLog[];
}

export async function findByItemRange(pool: Pool, days = 30): Promise<UsageLog[]> {
  // pool.query (not execute) because INTERVAL ? DAY doesn't work with prepared statements
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT item_id, quantity_used, logged_at
     FROM usage_logs
     WHERE logged_at >= DATE_SUB(NOW(), INTERVAL ${Number(days)} DAY)
     ORDER BY item_id, logged_at ASC`,
  );
  return rows as UsageLog[];
}

export async function getDailyStats(
  pool: Pool,
  days = 30,
): Promise<Array<{ day: string; total_used: number; log_count: number }>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(logged_at) AS day,
            SUM(quantity_used)  AS total_used,
            COUNT(*)            AS log_count
     FROM usage_logs
     WHERE logged_at >= DATE_SUB(NOW(), INTERVAL ${Number(days)} DAY)
     GROUP BY DATE(logged_at)
     ORDER BY day ASC`,
  );
  return rows as Array<{ day: string; total_used: number; log_count: number }>;
}

export async function getTopConsumed(
  pool: Pool,
  days = 30,
  limit = 8,
): Promise<Array<{
  item_id: number; name: string; unit: string;
  category: string; total_used: number; log_count: number;
}>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ul.item_id, i.name, i.unit, i.category,
            SUM(ul.quantity_used) AS total_used,
            COUNT(ul.id)          AS log_count
     FROM usage_logs ul
     JOIN items i ON i.id = ul.item_id
     WHERE ul.logged_at >= DATE_SUB(NOW(), INTERVAL ${Number(days)} DAY)
       AND i.is_archived = 0
     GROUP BY ul.item_id, i.name, i.unit, i.category
     ORDER BY total_used DESC
     LIMIT ${Number(limit)}`,
  );
  return rows as Array<{
    item_id: number; name: string; unit: string;
    category: string; total_used: number; log_count: number;
  }>;
}
