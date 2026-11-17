import app from './app.js';
import { connectDatabase } from './config/database.js';

const port = process.env.PORT || 5000;
try {
  await connectDatabase(process.env.MONGODB_URI);
  app.listen(port, () => process.stdout.write(`SeduhLog API berjalan pada port ${port}\n`));
} catch (error) {
  console.error(`Gagal menghubungkan database: ${error.message}`);
  process.exit(1);
}
