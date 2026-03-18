import 'dotenv/config';
import { createApp } from './app.js';
import { getPool } from './db/connection.js';
import { runMigrations } from './db/migrations.js';

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  const pool = getPool();
  await runMigrations(pool);
  console.log('Database migrations complete.');

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`ShelfSense API running at http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
