/**
 * Item Repository — Data Access Layer.
 * Only raw SQL queries. Zero business logic.
 */
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Item } from '../types/index.js';

export interface ItemFilters {
  search?:   string;
  category?: string;
  low_stock?: boolean;
  sort?:  string;
  order?: 'asc' | 'desc';
}

export async function findAll(pool: Pool, filters: ItemFilters): Promise<Item[]> {
  let sql = 'SELECT * FROM items WHERE is_archived = 0';
  const params: (string | number)[] = [];

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

  const sortable: Record<string, string> = {
    name: 'name', quantity: 'quantity',
    expiry_date: 'expiry_date', created_at: 'created_at',
  };
  const col = sortable[filters.sort ?? ''] ?? 'name';
  const dir = filters.order === 'desc' ? 'DESC' : 'ASC';
  sql += ` ORDER BY ${col} ${dir}`;

  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows as Item[];
}

export async function findById(pool: Pool, id: number): Promise<Item | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM items WHERE id = ? AND is_archived = 0',
    [id],
  );
  return rows.length ? (rows[0] as Item) : null;
}

export type InsertPayload = Pick<
  Item,
  'name' | 'quantity' | 'unit' | 'category' |
  'expiry_date' | 'reorder_threshold' | 'cost_per_unit' | 'supplier' | 'purchase_date'
>;

export async function insert(pool: Pool, data: InsertPayload): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO items
       (name, quantity, unit, category, expiry_date, reorder_threshold,
        cost_per_unit, supplier, purchase_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name, data.quantity, data.unit, data.category,
      data.expiry_date ?? null, data.reorder_threshold,
      data.cost_per_unit ?? null, data.supplier ?? null, data.purchase_date ?? null,
    ],
  );
  return result.insertId;
}

export type UpdatePayload = Partial<InsertPayload>;

export async function update(pool: Pool, id: number, patch: UpdatePayload): Promise<boolean> {
  const allowed = [
    'name','quantity','unit','category','expiry_date',
    'reorder_threshold','cost_per_unit','supplier','purchase_date',
  ];
  const fields = Object.keys(patch).filter((k) => allowed.includes(k));
  if (fields.length === 0) return true;

  const setClauses = fields.map((f) => `\`${f}\` = ?`).join(', ');
  const values     = fields.map((f) => (patch as Record<string, unknown>)[f] ?? null);

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE items SET ${setClauses} WHERE id = ? AND is_archived = 0`,
    [...values, id],
  );
  return result.affectedRows > 0;
}

export async function softDelete(pool: Pool, id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE items SET is_archived = 1 WHERE id = ? AND is_archived = 0',
    [id],
  );
  return result.affectedRows > 0;
}

export async function findAllActive(pool: Pool): Promise<Item[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM items WHERE is_archived = 0 ORDER BY name ASC',
  );
  return rows as Item[];
}
