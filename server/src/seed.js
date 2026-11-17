import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { closePool, getPool, initializeDatabase } from './db/pool.js';

const beans = [
  ['Gayo', 'Gayo, Aceh', 'washed', 'medium', ['Cokelat', 'Rempah']],
  ['Toraja Sapan', 'Toraja, Sulawesi Selatan', 'natural', 'light', ['Buah beri', 'Floral']],
  ['Kintamani', 'Kintamani, Bali', 'washed', 'light', ['Jeruk', 'Manis madu']],
  ['Flores Bajawa', 'Bajawa, Nusa Tenggara Timur', 'honey', 'medium', ['Karamel', 'Kacang']],
  ['Java Preanger', 'Pangalengan, Jawa Barat', 'anaerobic', 'medium', ['Buah beri', 'Cokelat']],
  ['Wamena', 'Wamena, Papua', 'washed', 'light', ['Floral', 'Jeruk']]
];
const methods = ['v60', 'french_press', 'aeropress', 'espresso', 'tubruk', 'moka_pot', 'cold_brew'];
const ratios = { v60: 16, french_press: 15, aeropress: 15, espresso: 2, tubruk: 12, moka_pot: 10, cold_brew: 8 };

try {
  await initializeDatabase();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT (SELECT COUNT(*) FROM beans) + (SELECT COUNT(*) FROM brews) AS count');
    if (Number(existing.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      process.stdout.write('Database sudah berisi data; seed dilewati agar data pengguna tidak terhapus.\n');
    } else {
      const savedBeans = [];
      for (const [name, origin, process, roastLevel, flavorNotes] of beans) {
        const { rows } = await client.query(
          `INSERT INTO beans (id, name, origin, process, roast_level, flavor_notes)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, flavor_notes`,
          [randomUUID(), name, origin, process, roastLevel, flavorNotes]
        );
        savedBeans.push(rows[0]);
      }
      for (let index = 0; index < 15; index += 1) {
        const bean = savedBeans[index % savedBeans.length];
        const method = methods[index % methods.length];
        const doseGrams = method === 'espresso' ? 18 : 15 + index % 4;
        await client.query(
          `INSERT INTO brews (id, bean_id, method, dose_grams, water_grams, water_temp_c, grind_size,
            brew_time_seconds, rating, is_favorite, taste_tags, notes, cupping, brewed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14)`,
          [randomUUID(), bean.id, method, doseGrams, doseGrams * ratios[method], 88 + index % 9,
            ['medium_fine', 'coarse', 'fine'][index % 3], 120 + index * 8, 3 + index % 3,
            index % 4 === 0, bean.flavor_notes.slice(0, 2),
            `Seduhan ${method} dengan karakter ${bean.flavor_notes[0]}.`,
            JSON.stringify({ aroma: 7 + index % 3, flavor: 7 + (index + 1) % 3, acidity: 6 + index % 4, body: 7, sweetness: 8, aftertaste: 7, balance: 8 }),
            new Date(Date.now() - (index * 3 + index % 4) * 86400000)]
        );
      }
      await client.query('COMMIT');
      process.stdout.write('Seed berhasil: 6 biji dan 15 seduhan.\n');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error(`Seed gagal: ${error.message}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
