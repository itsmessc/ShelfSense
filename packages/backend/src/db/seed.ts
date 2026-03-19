import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../../.env') });

import type { RowDataPacket } from 'mysql2';
import { getPool, closePool } from './connection.js';
import { runMigrations } from './migrations.js';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(__dirname, '../data/sample-data.json');
const sampleData = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as Array<{
  name: string; quantity: number; unit: string; category: string;
  expiry_date: string | null; reorder_threshold: number;
  cost_per_unit: number | null; supplier: string | null; purchase_date: string | null;
}>;

const pool = getPool();
await runMigrations(pool);

await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
await pool.execute('TRUNCATE TABLE usage_logs');
await pool.execute('TRUNCATE TABLE audit_logs');
await pool.execute('TRUNCATE TABLE item_batches');
await pool.execute('TRUNCATE TABLE items');
await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

console.log('Inserting items and batches...');
for (const item of sampleData) {
  const [result] = await pool.execute<import('mysql2').ResultSetHeader>(
    `INSERT INTO items (name, quantity, unit, category, expiry_date, reorder_threshold, cost_per_unit, supplier, purchase_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.name, item.quantity, item.unit, item.category,
     item.expiry_date ?? null, item.reorder_threshold,
     item.cost_per_unit ?? null, item.supplier ?? null, item.purchase_date ?? null]
  );
  const itemId = result.insertId;

  // Insert primary batch
  await pool.execute(
    'INSERT INTO item_batches (item_id, quantity, expiry_date) VALUES (?, ?, ?)',
    [itemId, item.quantity, item.expiry_date ?? null]
  );

  // Demo: Add a second batch for Oat Milk to show multi-expiry
  if (item.name === 'Oat Milk') {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const expiryStr = nextMonth.toISOString().slice(0, 10);
    
    await pool.execute(
      'INSERT INTO item_batches (item_id, quantity, expiry_date) VALUES (?, ?, ?)',
      [itemId, 3, expiryStr]
    );

    // Update main item quantity to reflect both batches (2 from JSON + 3 new = 5)
    await pool.execute(
      'UPDATE items SET quantity = quantity + 3 WHERE id = ?',
      [itemId]
    );
  }
}

// Synthetic usage logs for forecasting demo (last 20 days of data)
const usageLogs: Array<{ name: string; uses: number[] }> = [
  // Beverages — consistent daily use
  { name: 'Fair-Trade Coffee Beans', uses: [0.05, 0.05, 0.06, 0.05, 0.05, 0.05, 0.06, 0.05, 0.05, 0.05, 0.06, 0.05, 0.05, 0.05, 0.06, 0.05, 0.05, 0.05, 0.06, 0.05] },
  { name: 'Green Tea Bags',          uses: [2, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2] },
  // Dairy/Plant milk — every other day
  { name: 'Almond Milk Unsweetened', uses: [0.2, 0.2, 0.15, 0.2, 0.2, 0.15, 0.2, 0.2, 0.15, 0.2, 0.2, 0.15] },
  { name: 'Oat Milk',                uses: [0.25, 0.25, 0.3, 0.25, 0.25, 0.3, 0.25, 0.25, 0.3, 0.25] },
  // Grains — a few times a week
  { name: 'Organic Rolled Oats',     uses: [0.1, 0.08, 0.1, 0.08, 0.1, 0.08, 0.1, 0.08, 0.1, 0.08] },
  { name: 'Quinoa',                  uses: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1] },
  // Produce — daily small amounts
  { name: 'Spinach Leaves',          uses: [0.05, 0.05, 0.06, 0.05, 0.05, 0.06, 0.05, 0.05, 0.06, 0.05, 0.05, 0.06, 0.05, 0.05] },
  { name: 'Canned Tomatoes',         uses: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  // Legumes — weekly
  { name: 'Black Lentils',           uses: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15] },
  { name: 'Canned Chickpeas',        uses: [1, 1, 1, 1, 1, 1, 1, 1] },
  // Lab / cleaning
  { name: 'Isopropyl Alcohol 70%',   uses: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05] },
  { name: 'Nitrile Lab Gloves',      uses: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
  { name: 'Hand Sanitizer',          uses: [0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02] },
  // Office
  { name: 'Printer Paper A4',        uses: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1] },
  { name: 'Whiteboard Markers',      uses: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1] },
  // Oils
  { name: 'Coconut Oil',             uses: [0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02] },
  { name: 'Olive Oil Extra Virgin',  uses: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03] },
];

for (const { name, uses } of usageLogs) {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM items WHERE name = ?', [name]);
  if (!(rows as RowDataPacket[]).length) continue;
  const itemId = (rows as RowDataPacket[])[0].id as number;

  for (let i = 0; i < uses.length; i++) {
    const daysAgo = uses.length - i;
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO usage_logs (item_id, quantity_used, logged_at, notes) VALUES (?, ?, ?, ?)',
      [itemId, uses[i], date, 'Synthetic usage']
    );
  }
}

await closePool();
console.log(`Seeded ${sampleData.length} items with usage logs.`);
