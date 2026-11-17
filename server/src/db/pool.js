import pg from 'pg';
import { schemaSql, securitySql } from './schema.js';

const { Pool } = pg;
let pool;
let schemaPromise;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum dikonfigurasi');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? true : undefined,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    });
    pool.on('error', error => console.error(`Koneksi PostgreSQL idle bermasalah: ${error.message}`));
  }
  return pool;
}

export async function initializeDatabase() {
  if (!schemaPromise) {
    schemaPromise = getPool().query(schemaSql)
      .then(() => process.env.NODE_ENV === 'test' ? undefined : getPool().query(securitySql))
      .catch(error => {
        schemaPromise = undefined;
        throw error;
      });
  }
  return schemaPromise;
}

export function setPoolForTests(testPool) {
  pool = testPool;
  schemaPromise = undefined;
}

export async function closePool() {
  if (pool) await pool.end();
  pool = undefined;
  schemaPromise = undefined;
}
