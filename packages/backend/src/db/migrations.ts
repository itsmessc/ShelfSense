import type mysql from 'mysql2/promise';

export async function runMigrations(pool: mysql.Pool): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      name              VARCHAR(255) NOT NULL,
      quantity          DECIMAL(10,3) NOT NULL DEFAULT 0,
      unit              VARCHAR(50) NOT NULL,
      category          VARCHAR(100) NOT NULL DEFAULT 'Uncategorized',
      expiry_date       DATE,
      reorder_threshold DECIMAL(10,3) NOT NULL DEFAULT 0,
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
}
