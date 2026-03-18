import 'dotenv/config';
import type { RowDataPacket } from 'mysql2';
import { getPool, closePool } from './connection.js';
import { runMigrations } from './migrations.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, '../data/sample-data.json');
const sampleData = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as Array<{
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiry_date: string | null;
  reorder_threshold: number;
}>;

const pool = getPool();
await runMigrations(pool);

await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
await pool.execute('TRUNCATE TABLE usage_logs');
await pool.execute('TRUNCATE TABLE items');
await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

for (const item of sampleData) {
  await pool.execute(
    `INSERT INTO items (name, quantity, unit, category, expiry_date, reorder_threshold)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [item.name, item.quantity, item.unit, item.category, item.expiry_date ?? null, item.reorder_threshold]
  );
}

const usageLogs: Array<{ name: string; uses: number[] }> = [
  { name: 'Fair-Trade Coffee Beans', uses: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05] },
  { name: 'Almond Milk Unsweetened', uses: [0.2, 0.2, 0.15, 0.2, 0.2] },
  { name: 'Organic Rolled Oats', uses: [0.08, 0.08, 0.08, 0.08] },
];

for (const { name, uses } of usageLogs) {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM items WHERE name = ?',
    [name]
  );
  if (!rows.length) continue;
  const itemId = rows[0].id as number;

  for (let i = 0; i < uses.length; i++) {
    const daysAgo = uses.length - i;
    const date = new Date(Date.now() - daysAgo * 86400000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    await pool.execute(
      'INSERT INTO usage_logs (item_id, quantity_used, logged_at, notes) VALUES (?, ?, ?, ?)',
      [itemId, uses[i], date, 'Synthetic usage']
    );
  }
}

await closePool();
console.log(`Seeded ${sampleData.length} items with usage logs.`);
