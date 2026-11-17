import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import api from './routes/api.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { connectDatabase } from './config/database.js';
import { configureDnsResolver } from './config/dns.js';

configureDnsResolver();
const app = express();
const origins = (process.env.CLIENT_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
app.use(helmet());
app.use(cors({ origin(origin, callback) {
  const allowed = !origin || origins.includes(origin) || (process.env.NODE_ENV !== 'production' && origin === 'http://localhost:5173');
  callback(allowed ? null : new Error('Origin tidak diizinkan'), allowed);
} }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan('tiny'));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, message: 'Terlalu banyak permintaan, coba lagi nanti', errors: [] })
}));
app.use('/api', async (req, res, next) => {
  if (req.path === '/health' || req.path === '/methods') return next();
  try {
    await connectDatabase(process.env.MONGODB_URI);
    next();
  } catch (error) {
    next(error);
  }
});
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

export default app;
