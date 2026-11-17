import 'dotenv/config';
import dns from 'node:dns';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const dnsServers = process.env.MONGODB_DNS_SERVERS?.split(',').map(server => server.trim()).filter(Boolean);
if (dnsServers?.length) dns.setServers(dnsServers);

const port = process.env.PORT || 5000;
try {
  await connectDatabase(process.env.MONGODB_URI);
  app.listen(port, () => process.stdout.write(`SeduhLog API berjalan pada port ${port}\n`));
} catch (error) {
  console.error(`Gagal menghubungkan database: ${error.message}`);
  process.exit(1);
}
