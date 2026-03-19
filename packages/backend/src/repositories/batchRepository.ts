/**
 * Batch Repository — Data Access Layer for item_batches.
 */
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface ItemBatch {
  id: number;
  item_id: number;
  quantity: number;
  expiry_date: string | null;
  received_at: string;
}

export async function findByItemId(pool: Pool, itemId: number): Promise<ItemBatch[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM item_batches WHERE item_id = ? AND quantity > 0 ORDER BY expiry_date ASC, id ASC',
    [itemId]
  );
  return rows as ItemBatch[];
}

export async function insert(pool: Pool, data: Omit<ItemBatch, 'id' | 'received_at'>): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO item_batches (item_id, quantity, expiry_date) VALUES (?, ?, ?)',
    [data.item_id, data.quantity, data.expiry_date || null]
  );
  return result.insertId;
}

export async function update(pool: Pool, id: number, patch: Partial<Omit<ItemBatch, 'id' | 'item_id' | 'received_at'>>): Promise<void> {
  const fields = Object.keys(patch);
  if (fields.length === 0) return;

  const setStr = fields.map(f => `\`${f}\` = ?`).join(', ');
  const values = fields.map(f => (patch as any)[f]);

  await pool.execute(
    `UPDATE item_batches SET ${setStr} WHERE id = ?`,
    [...values, id]
  );
}

export async function deleteBatch(pool: Pool, id: number): Promise<void> {
  await pool.execute('DELETE FROM item_batches WHERE id = ?', [id]);
}

/**
 * Deduct quantity from batches using FEFO (First Expired, First Out)
 */
export async function deductFEFO(pool: Pool, itemId: number, amount: number): Promise<void> {
  // We handle this in a transaction-style loop usually
  // For simplicity, we'll just query and update sequentially here as we assume pool logic handles isolation
  const batches = await findByItemId(pool, itemId);
  let remaining = amount;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const use = Math.min(batch.quantity, remaining);
    const newQty = batch.quantity - use;
    remaining -= use;

    if (newQty <= 0) {
      await deleteBatch(pool, batch.id);
    } else {
      await update(pool, batch.id, { quantity: newQty });
    }
  }
}
