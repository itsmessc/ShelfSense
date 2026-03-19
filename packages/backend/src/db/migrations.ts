import type mysql from 'mysql2/promise';

export async function runMigrations(pool: mysql.Pool): Promise<void> {
  // Core items table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      name              VARCHAR(255) NOT NULL,
      quantity          DECIMAL(10,3) NOT NULL DEFAULT 0,
      unit              VARCHAR(50) NOT NULL,
      category          VARCHAR(100) NOT NULL DEFAULT 'Uncategorized',
      expiry_date       DATE,
      reorder_threshold DECIMAL(10,3) NOT NULL DEFAULT 0,
      cost_per_unit     DECIMAL(10,2),
      supplier          VARCHAR(255),
      purchase_date     DATE,
      is_archived       TINYINT(1) NOT NULL DEFAULT 0,
      created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      item_id       INT NOT NULL,
      quantity_used DECIMAL(10,3) NOT NULL,
      logged_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes         TEXT,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `);

  // Audit log for all inventory actions
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      entity_type VARCHAR(50)  NOT NULL,
      entity_id   INT          NULL,
      action      VARCHAR(50)  NOT NULL,
      summary     VARCHAR(500) NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created_at (created_at DESC)
    )
  `);

  // Add new columns to existing installations (idempotent)
  const alterColumns: Array<[string, string]> = [
    ['cost_per_unit',  'ALTER TABLE items ADD COLUMN cost_per_unit  DECIMAL(10,2)     AFTER reorder_threshold'],
    ['supplier',       'ALTER TABLE items ADD COLUMN supplier        VARCHAR(255)       AFTER cost_per_unit'],
    ['purchase_date',  'ALTER TABLE items ADD COLUMN purchase_date   DATE              AFTER supplier'],
    ['is_archived',    'ALTER TABLE items ADD COLUMN is_archived     TINYINT(1) NOT NULL DEFAULT 0 AFTER purchase_date'],
  ];

  for (const [col, ddl] of alterColumns) {
    try {
      const [rows] = await pool.execute<mysql.RowDataPacket[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'items' AND COLUMN_NAME = ?`,
        [col]
      );
      if (!(rows as mysql.RowDataPacket[]).length) {
        await pool.execute(ddl);
      }
    } catch {
      // column may already exist — safe to ignore
    }
  }

  // --- Batch Tracking System ---
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS item_batches (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      item_id      INT NOT NULL,
      quantity     DECIMAL(10,3) NOT NULL,
      expiry_date  DATE,
      received_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `);

  // Data Migration: Create initial batches for existing items that don't have any
  const [items] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id, quantity, expiry_date FROM items WHERE is_archived = 0 AND quantity > 0'
  );

  for (const item of items) {
    const [batches] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM item_batches WHERE item_id = ?',
      [item.id]
    );

    if (batches.length === 0) {
      // Create a default batch representing current state
      await pool.execute(
        'INSERT INTO item_batches (item_id, quantity, expiry_date) VALUES (?, ?, ?)',
        [item.id, item.quantity, item.expiry_date]
      );
    }
  }
}
