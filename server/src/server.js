import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { configureDnsResolver } from './config/dns.js';

configureDnsResolver();

const port = process.env.PORT || 5000;
try {
  await connectDatabase(process.env.MONGODB_URI);
  app.listen(port, () => process.stdout.write(`SeduhLog API berjalan pada port ${port}\n`));
} catch (error) {
  console.error(`Gagal menghubungkan database: ${error.message}`);
  process.exit(1);
}
