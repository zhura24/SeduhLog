import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { beans, brews } from './data/seedData.js';
import { closePool, getPool, initializeDatabase } from './db/pool.js';

const cuppingFields = ['aroma', 'flavor', 'acidity', 'body', 'sweetness', 'aftertaste', 'balance'];

function brewDate(daysAgo, hour, now) {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function dateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function seedDatabase() {
  await initializeDatabase();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT (SELECT COUNT(*) FROM beans) + (SELECT COUNT(*) FROM brews) AS count');
    if (Number(existing.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return { seeded: false, beanCount: 0, brewCount: 0 };
    }

    const now = new Date();
    const brewRows = brews.map(row => ({
      row,
      brewedAt: brewDate(row[13], row[14], now)
    }));
    const beanIds = new Map();

    for (const bean of beans) {
      const oldestBrew = brewRows
        .filter(item => item.row[0] === bean.key)
        .reduce((oldest, item) => !oldest || item.brewedAt < oldest ? item.brewedAt : oldest, null);
      const roastedAt = oldestBrew
        ? new Date(oldestBrew)
        : new Date(now);
      roastedAt.setDate(roastedAt.getDate() - (oldestBrew ? bean.restDays : bean.roastDaysAgo));

      const { rows } = await client.query(
        `INSERT INTO beans (id, name, origin, roaster, process, roast_level, variety, altitude_masl,
          roast_date, flavor_notes, image_url, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::numeric,$9::date,$10::text[],$11,$12) RETURNING id`,
        [randomUUID(), bean.name, bean.origin, bean.roaster || null, bean.process, bean.roastLevel,
          bean.variety || null, bean.altitudeMasl ?? null, dateOnly(roastedAt), bean.flavorNotes, bean.imageUrl || null, bean.notes || null]
      );
      beanIds.set(bean.key, rows[0].id);
    }

    for (const item of brewRows) {
      const [beanKey, method, doseGrams, waterGrams, waterTempC, grindSize, grinderSetting,
        brewTimeSeconds, tdsPercent, rating, scores, tasteTags, notes, , , isFavorite] = item.row;
      const cupping = scores
        ? Object.fromEntries(cuppingFields.map((field, index) => [field, scores[index]]))
        : {};
      await client.query(
        `INSERT INTO brews (id, bean_id, method, dose_grams, water_grams, water_temp_c, grind_size,
          grinder_setting, brew_time_seconds, tds_percent, rating, cupping, taste_tags, notes, is_favorite, brewed_at)
         VALUES ($1,$2,$3,$4::numeric,$5::numeric,$6::numeric,$7,$8,$9::numeric,$10::numeric,
          $11::integer,$12::jsonb,$13::text[],$14,$15::boolean,$16::timestamptz)`,
        [randomUUID(), beanIds.get(beanKey), method, doseGrams, waterGrams, waterTempC,
          grindSize || null, grinderSetting || null, brewTimeSeconds, tdsPercent, rating,
          JSON.stringify(cupping), tasteTags || [], notes || null, isFavorite, item.brewedAt]
      );
    }

    await client.query('COMMIT');
    return { seeded: true, beanCount: beans.length, brewCount: brews.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await seedDatabase();
    process.stdout.write(result.seeded
      ? `Seed berhasil: ${result.beanCount} biji kopi dan ${result.brewCount} seduhan.\n`
      : 'Database sudah berisi data; seed dilewati agar data yang ada tidak tertimpa.\n');
  } catch (error) {
    console.error(`Seed gagal: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
