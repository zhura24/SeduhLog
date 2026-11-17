import 'dotenv/config';
import app from './app.js';
import { initializeDatabase } from './db/pool.js';

const port = process.env.PORT || 5000;
try {
  await initializeDatabase();
  app.listen(port, () => process.stdout.write(`SeduhLog API berjalan pada port ${port}\n`));
} catch (error) {
  console.error(`Gagal menyiapkan PostgreSQL: ${error.message}`);
  process.exit(1);
}
