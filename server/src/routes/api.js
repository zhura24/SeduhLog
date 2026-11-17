import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { getPool } from '../db/pool.js';
import { asyncHandler, badRequest, response } from '../middleware/errors.js';
import { getHealth, getMethods } from '../controllers/meta.js';
import { beanSchema, brewSchema } from '../validators/api.js';

const router = Router();
const parse = (schema, input) => schema.parse(input);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const checkId = id => { if (!uuidPattern.test(String(id))) throw badRequest('Format ID tidak valid'); };
const findOr404 = async (table, id) => {
  checkId(id);
  const { rows } = await getPool().query(`SELECT * FROM ${table} WHERE id = $1 AND archived_at IS NULL`, [id]);
  if (!rows[0]) throw Object.assign(new Error('Data tidak ditemukan'), { status: 404 });
  return rows[0];
};
const withTransaction = async callback => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
const notFound = () => Object.assign(new Error('Data tidak ditemukan'), { status: 404 });
const conflict = message => Object.assign(new Error(message), { status: 409 });
const pageParams = query => ({ page: Math.max(1, Number(query.page) || 1), limit: Math.min(50, Math.max(1, Number(query.limit) || 10)) });
const beanFromRow = row => ({
  id: row.id,
  name: row.name,
  origin: row.origin,
  roaster: row.roaster,
  process: row.process,
  roastLevel: row.roast_level,
  variety: row.variety,
  altitudeMasl: row.altitude_masl === null ? null : Number(row.altitude_masl),
  roastDate: row.roast_date,
  flavorNotes: row.flavor_notes || [],
  imageUrl: row.image_url,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(row.archived_at ? { archivedAt: row.archived_at } : {})
});
const brewFromRow = (row, bean = null) => {
  const result = {
    id: row.id,
    bean: bean || row.bean_id,
    method: row.method,
    doseGrams: Number(row.dose_grams),
    waterGrams: Number(row.water_grams),
    waterTempC: row.water_temp_c === null ? null : Number(row.water_temp_c),
    grindSize: row.grind_size,
    grinderSetting: row.grinder_setting,
    brewTimeSeconds: row.brew_time_seconds === null ? null : Number(row.brew_time_seconds),
    tdsPercent: row.tds_percent === null ? null : Number(row.tds_percent),
    rating: row.rating,
    cupping: row.cupping || {},
    tasteTags: row.taste_tags || [],
    notes: row.notes,
    isFavorite: row.is_favorite,
    brewedAt: row.brewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.archived_at ? { archivedAt: row.archived_at } : {})
  };
  result.ratio = Math.round((result.waterGrams / result.doseGrams) * 10) / 10;
  const scores = ['aroma', 'flavor', 'acidity', 'body', 'sweetness', 'aftertaste', 'balance']
    .map(key => Number(result.cupping[key]))
    .filter(value => Number.isInteger(value) && value >= 1 && value <= 10);
  result.cuppingAverage = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length * 10) / 10 : null;
  return result;
};
const joinedBean = row => row.bean_id ? {
  id: row.bean_id,
  name: row.bean_name,
  origin: row.bean_origin
} : null;
const brewSelect = `SELECT r.*, b.name AS bean_name, b.origin AS bean_origin FROM brews r JOIN beans b ON b.id = r.bean_id`;

router.get('/health', getHealth);
router.get('/methods', getMethods);

router.get('/archive/beans', asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const [items, count, brewCounts] = await Promise.all([
    getPool().query('SELECT * FROM beans WHERE archived_at IS NOT NULL ORDER BY archived_at DESC LIMIT $1 OFFSET $2', [limit, (page - 1) * limit]),
    getPool().query('SELECT COUNT(*)::int AS total FROM beans WHERE archived_at IS NOT NULL'),
    getPool().query('SELECT bean_id, COUNT(*)::int AS count FROM brews GROUP BY bean_id')
  ]);
  const countsByBean = new Map(brewCounts.rows.map(item => [item.bean_id, Number(item.count)]));
  response(res, items.rows.map(row => ({ ...beanFromRow(row), brewCount: countsByBean.get(row.id) || 0 })), 'Berhasil', {
    page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit)
  });
}));

router.get('/archive/brews', asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const [items, count] = await Promise.all([
    getPool().query(`${brewSelect} WHERE r.archived_at IS NOT NULL ORDER BY r.archived_at DESC LIMIT $1 OFFSET $2`, [limit, (page - 1) * limit]),
    getPool().query('SELECT COUNT(*)::int AS total FROM brews WHERE archived_at IS NOT NULL')
  ]);
  response(res, items.rows.map(row => brewFromRow(row, joinedBean(row))), 'Berhasil', {
    page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit)
  });
}));

router.patch('/archive/beans/:id/restore', asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const result = await withTransaction(async client => {
    const { rows } = await client.query(
      'UPDATE beans SET archived_at = NULL, updated_at = now() WHERE id = $1 AND archived_at IS NOT NULL RETURNING *',
      [req.params.id]
    );
    if (!rows[0]) throw notFound();
    const restored = await client.query(
      'UPDATE brews SET archived_at = NULL, archived_with_bean = false, updated_at = now() WHERE bean_id = $1 AND archived_with_bean = true RETURNING id',
      [req.params.id]
    );
    return { bean: beanFromRow(rows[0]), restoredBrews: restored.rows.length };
  });
  response(res, { restoredBrews: result.restoredBrews }, 'Biji Kopi dan Seduhan terkait berhasil dipulihkan');
}));

router.patch('/archive/brews/:id/restore', asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const brew = await getPool().query('SELECT bean_id FROM brews WHERE id = $1 AND archived_at IS NOT NULL', [req.params.id]);
  if (!brew.rows[0]) throw notFound();
  await withTransaction(async client => {
    const bean = await client.query('SELECT id FROM beans WHERE id = $1 AND archived_at IS NULL FOR UPDATE', [brew.rows[0].bean_id]);
    if (!bean.rows[0]) throw conflict('Pulihkan Biji Kopi terlebih dahulu sebelum memulihkan Seduhan ini');
    const restored = await client.query(
      'UPDATE brews SET archived_at = NULL, archived_with_bean = false, updated_at = now() WHERE id = $1 AND archived_at IS NOT NULL RETURNING id',
      [req.params.id]
    );
    if (!restored.rows[0]) throw notFound();
  });
  response(res, null, 'Seduhan berhasil dipulihkan');
}));

router.delete('/archive/beans/:id', asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const result = await withTransaction(async client => {
    const { rows } = await client.query('SELECT id FROM beans WHERE id = $1 AND archived_at IS NOT NULL FOR UPDATE', [req.params.id]);
    if (!rows[0]) throw notFound();
    const activeBrews = await client.query('SELECT COUNT(*)::int AS count FROM brews WHERE bean_id = $1 AND archived_at IS NULL', [req.params.id]);
    if (activeBrews.rows[0].count) throw conflict('Pulihkan dan arsipkan kembali Biji Kopi sebelum menghapusnya permanen');
    const deleted = await client.query('DELETE FROM brews WHERE bean_id = $1 RETURNING id', [req.params.id]);
    await client.query('DELETE FROM beans WHERE id = $1', [req.params.id]);
    return deleted.rows.length;
  });
  response(res, { deletedBrews: result }, 'Biji Kopi dan Seduhan terkait dihapus permanen');
}));

router.delete('/archive/brews/:id', asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const { rows } = await getPool().query('SELECT archived_at FROM brews WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw notFound();
  if (!rows[0].archived_at) throw conflict('Arsipkan Seduhan terlebih dahulu sebelum menghapusnya permanen');
  await getPool().query('DELETE FROM brews WHERE id = $1', [req.params.id]);
  response(res, null, 'Seduhan dihapus permanen');
}));

router.get('/beans', asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const clauses = ['archived_at IS NULL'];
  const values = [];
  if (req.query.q) {
    values.push(`%${String(req.query.q).replace(/[\\%_]/g, '\\$&')}%`);
    clauses.push(`(name ILIKE $${values.length} ESCAPE '\\' OR origin ILIKE $${values.length} ESCAPE '\\' OR roaster ILIKE $${values.length} ESCAPE '\\')`);
  }
  if (req.query.process) { values.push(req.query.process); clauses.push(`process = $${values.length}`); }
  if (req.query.roastLevel) { values.push(req.query.roastLevel); clauses.push(`roast_level = $${values.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sort = req.query.sort === 'name' ? 'name ASC' : 'created_at DESC';
  const [items, count, brewCounts] = await Promise.all([
    getPool().query(`SELECT * FROM beans ${where} ORDER BY ${sort} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, (page - 1) * limit]),
    getPool().query(`SELECT COUNT(*)::int AS total FROM beans ${where}`, values),
    getPool().query('SELECT bean_id, COUNT(*)::int AS count FROM brews WHERE archived_at IS NULL GROUP BY bean_id')
  ]);
  const countsByBean = new Map(brewCounts.rows.map(item => [item.bean_id, Number(item.count)]));
  response(res, items.rows.map(item => ({ ...beanFromRow(item), brewCount: countsByBean.get(item.id) || 0 })), 'Berhasil', {
    page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit)
  });
}));

router.post('/beans', asyncHandler(async (req, res) => {
  const data = parse(beanSchema, req.body);
  const { rows } = await getPool().query(
    `INSERT INTO beans (id, name, origin, roaster, process, roast_level, variety, altitude_masl, roast_date, flavor_notes, image_url, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [randomUUID(), data.name, data.origin, data.roaster || null, data.process || 'washed', data.roastLevel || 'medium',
      data.variety || null, data.altitudeMasl ?? null, data.roastDate ?? null, data.flavorNotes || [], data.imageUrl || null, data.notes || null]
  );
  response(res, beanFromRow(rows[0]), 'Biji Kopi berhasil ditambahkan', undefined, 201);
}));

router.get('/beans/:id', asyncHandler(async (req, res) => {
  const bean = beanFromRow(await findOr404('beans', req.params.id));
  const [count, average, recent] = await Promise.all([
    getPool().query('SELECT COUNT(*)::int AS count FROM brews WHERE bean_id = $1 AND archived_at IS NULL', [bean.id]),
    getPool().query('SELECT AVG(rating)::float AS value FROM brews WHERE bean_id = $1 AND archived_at IS NULL', [bean.id]),
    getPool().query(`${brewSelect} WHERE r.bean_id = $1 AND r.archived_at IS NULL ORDER BY r.brewed_at DESC LIMIT 5`, [bean.id])
  ]);
  response(res, {
    ...bean,
    brewCount: count.rows[0].count,
    avgRating: average.rows[0].value === null ? null : Math.round(average.rows[0].value * 10) / 10,
    recentBrews: recent.rows.map(row => brewFromRow(row, joinedBean(row)))
  });
}));

router.put('/beans/:id', asyncHandler(async (req, res) => {
  await findOr404('beans', req.params.id);
  const data = parse(beanSchema.partial(), req.body);
  const columns = { name: 'name', origin: 'origin', roaster: 'roaster', process: 'process', roastLevel: 'roast_level',
    variety: 'variety', altitudeMasl: 'altitude_masl', roastDate: 'roast_date', flavorNotes: 'flavor_notes', imageUrl: 'image_url', notes: 'notes' };
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (!entries.length) return response(res, beanFromRow(await findOr404('beans', req.params.id)), 'Biji Kopi berhasil diperbarui');
  const values = entries.map(([, value]) => value);
  const set = entries.map(([key], index) => `${columns[key]} = $${index + 1}`);
  values.push(req.params.id);
  const { rows } = await getPool().query(`UPDATE beans SET ${set.join(', ')}, updated_at = now() WHERE id = $${values.length} AND archived_at IS NULL RETURNING *`, values);
  if (!rows[0]) throw notFound();
  response(res, beanFromRow(rows[0]), 'Biji Kopi berhasil diperbarui');
}));

router.delete('/beans/:id', asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const result = await withTransaction(async client => {
    const { rows } = await client.query('SELECT id FROM beans WHERE id = $1 AND archived_at IS NULL FOR UPDATE', [req.params.id]);
    if (!rows[0]) throw notFound();
    const archived = await client.query(
      'UPDATE brews SET archived_at = now(), archived_with_bean = true, updated_at = now() WHERE bean_id = $1 AND archived_at IS NULL RETURNING id',
      [req.params.id]
    );
    await client.query('UPDATE beans SET archived_at = now(), updated_at = now() WHERE id = $1', [req.params.id]);
    return archived.rows.length;
  });
  response(res, { archivedBrews: result }, 'Biji Kopi dan Seduhan terkait dipindahkan ke Arsip');
}));

router.get('/brews', asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const clauses = ['r.archived_at IS NULL'];
  const values = [];
  if (req.query.method) { values.push(req.query.method); clauses.push(`r.method = $${values.length}`); }
  if (req.query.beanId) { checkId(req.query.beanId); values.push(req.query.beanId); clauses.push(`r.bean_id = $${values.length}`); }
  if (req.query.minRating) { values.push(Number(req.query.minRating)); clauses.push(`r.rating >= $${values.length}`); }
  if (req.query.favorite === 'true') clauses.push('r.is_favorite = true');
  if (req.query.q) {
    values.push(`%${String(req.query.q).replace(/[\\%_]/g, '\\$&')}%`);
    clauses.push(`(r.notes ILIKE $${values.length} ESCAPE '\\' OR array_to_string(r.taste_tags, ' ') ILIKE $${values.length} ESCAPE '\\')`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sort = req.query.sort === 'oldest' ? 'r.brewed_at ASC' : req.query.sort === 'rating' ? 'r.rating DESC, r.brewed_at DESC' : 'r.brewed_at DESC';
  const [items, count] = await Promise.all([
    getPool().query(`${brewSelect} ${where} ORDER BY ${sort} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, (page - 1) * limit]),
    getPool().query(`SELECT COUNT(*)::int AS total FROM brews r ${where}`, values)
  ]);
  response(res, items.rows.map(row => brewFromRow(row, joinedBean(row))), 'Berhasil', {
    page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit)
  });
}));

router.post('/brews', asyncHandler(async (req, res) => {
  const data = parse(brewSchema, req.body);
  checkId(data.bean);
  const brew = await withTransaction(async client => {
    const beanResult = await client.query('SELECT id, name, origin FROM beans WHERE id = $1 AND archived_at IS NULL FOR UPDATE', [data.bean]);
    if (!beanResult.rows[0]) throw notFound();
    const { rows } = await client.query(
      `INSERT INTO brews (id, bean_id, method, dose_grams, water_grams, water_temp_c, grind_size, grinder_setting,
        brew_time_seconds, tds_percent, rating, cupping, taste_tags, notes, is_favorite, brewed_at)
       VALUES ($1,$2,$3,$4::numeric,$5::numeric,$6::numeric,$7,$8,$9::numeric,$10::numeric,$11::integer,
         $12::jsonb,$13::text[],$14,$15::boolean,COALESCE($16::timestamptz, now()))
       RETURNING *`,
      [randomUUID(), data.bean, data.method, data.doseGrams, data.waterGrams, data.waterTempC ?? null,
        data.grindSize || null, data.grinderSetting || null, data.brewTimeSeconds ?? null, data.tdsPercent ?? null,
        data.rating, JSON.stringify(data.cupping || {}), data.tasteTags || [], data.notes || null, data.isFavorite || false, data.brewedAt ?? null]
    );
    const bean = beanResult.rows[0];
    return brewFromRow(rows[0], { id: bean.id, name: bean.name, origin: bean.origin });
  });
  response(res, brew, 'Seduhan berhasil ditambahkan', undefined, 201);
}));

router.get('/brews/:id', asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const { rows } = await getPool().query(
    `SELECT r.*, b.id AS bean_id, b.name AS bean_name, b.origin AS bean_origin,
      b.roaster AS bean_roaster, b.process AS bean_process, b.roast_level AS bean_roast_level,
      b.variety AS bean_variety, b.altitude_masl AS bean_altitude_masl, b.roast_date AS bean_roast_date,
      b.flavor_notes AS bean_flavor_notes, b.image_url AS bean_image_url, b.notes AS bean_notes,
      b.created_at AS bean_created_at, b.updated_at AS bean_updated_at
     FROM brews r JOIN beans b ON b.id = r.bean_id
     WHERE r.id = $1 AND r.archived_at IS NULL AND b.archived_at IS NULL`, [req.params.id]
  );
  if (!rows[0]) throw Object.assign(new Error('Data tidak ditemukan'), { status: 404 });
  const row = rows[0];
  const bean = beanFromRow({
    id: row.bean_id, name: row.bean_name, origin: row.bean_origin, roaster: row.bean_roaster,
    process: row.bean_process, roast_level: row.bean_roast_level, variety: row.bean_variety,
    altitude_masl: row.bean_altitude_masl, roast_date: row.bean_roast_date, flavor_notes: row.bean_flavor_notes,
    image_url: row.bean_image_url, notes: row.bean_notes, created_at: row.bean_created_at, updated_at: row.bean_updated_at
  });
  response(res, brewFromRow(row, bean));
}));

router.put('/brews/:id', asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const existing = await findOr404('brews', req.params.id);
  const data = parse(brewSchema.partial(), req.body);
  const beanId = data.bean || existing.bean_id;
  checkId(beanId);
  const columns = { bean: 'bean_id', method: 'method', doseGrams: 'dose_grams', waterGrams: 'water_grams',
    waterTempC: 'water_temp_c', grindSize: 'grind_size', grinderSetting: 'grinder_setting',
    brewTimeSeconds: 'brew_time_seconds', tdsPercent: 'tds_percent', rating: 'rating', cupping: 'cupping',
    tasteTags: 'taste_tags', notes: 'notes', isFavorite: 'is_favorite', brewedAt: 'brewed_at' };
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const values = entries.map(([key, value]) => key === 'cupping' ? JSON.stringify(value) : value);
  const set = entries.map(([key], index) => `${columns[key]} = $${index + 1}${key === 'cupping' ? '::jsonb' : ''}`);
  const brew = await withTransaction(async client => {
    const beanResult = await client.query('SELECT id, name, origin FROM beans WHERE id = $1 AND archived_at IS NULL FOR UPDATE', [beanId]);
    if (!beanResult.rows[0]) throw notFound();
    values.push(req.params.id);
    const { rows } = await client.query(
      `UPDATE brews SET ${set.length ? `${set.join(', ')}, ` : ''}updated_at = now()
       WHERE id = $${values.length} AND archived_at IS NULL RETURNING *`, values
    );
    if (!rows[0]) throw notFound();
    const bean = beanResult.rows[0];
    return brewFromRow(rows[0], { id: bean.id, name: bean.name, origin: bean.origin });
  });
  response(res, brew, 'Seduhan berhasil diperbarui');
}));

router.patch('/brews/:id/favorite', asyncHandler(async (req, res) => {
  checkId(req.params.id);
  const { rows } = await getPool().query(
    'UPDATE brews SET is_favorite = NOT is_favorite, updated_at = now() WHERE id = $1 AND archived_at IS NULL RETURNING *', [req.params.id]
  );
  if (!rows[0]) throw Object.assign(new Error('Data tidak ditemukan'), { status: 404 });
  const bean = await findOr404('beans', rows[0].bean_id);
  response(res, brewFromRow(rows[0], { id: bean.id, name: bean.name, origin: bean.origin }), 'Favorit diperbarui');
}));

router.delete('/brews/:id', asyncHandler(async (req, res) => {
  await findOr404('brews', req.params.id);
  const { rows } = await getPool().query(
    'UPDATE brews SET archived_at = now(), archived_with_bean = false, updated_at = now() WHERE id = $1 AND archived_at IS NULL RETURNING id',
    [req.params.id]
  );
  if (!rows[0]) throw notFound();
  response(res, null, 'Seduhan dipindahkan ke Arsip');
}));

router.get('/stats', asyncHandler(async (req, res) => {
  const pool = getPool();
  const [totals, average, favorite, topBean, breakdown, recentDates] = await Promise.all([
    pool.query(`SELECT (SELECT COUNT(*)::int FROM brews WHERE archived_at IS NULL) AS total_brews,
      (SELECT COUNT(*)::int FROM beans WHERE archived_at IS NULL) AS total_beans`),
    pool.query('SELECT AVG(rating)::float AS value FROM brews WHERE archived_at IS NULL'),
    pool.query('SELECT method, COUNT(*)::int AS count FROM brews WHERE archived_at IS NULL GROUP BY method ORDER BY count DESC LIMIT 1'),
    pool.query(`SELECT b.id, b.name, COUNT(*)::int AS count FROM brews r JOIN beans b ON b.id = r.bean_id
      WHERE r.archived_at IS NULL AND b.archived_at IS NULL GROUP BY b.id, b.name ORDER BY count DESC LIMIT 1`),
    pool.query('SELECT method, COUNT(*)::int AS count FROM brews WHERE archived_at IS NULL GROUP BY method'),
    pool.query('SELECT brewed_at FROM brews WHERE archived_at IS NULL AND brewed_at >= $1', [new Date(Date.now() - 56 * 86400000)])
  ]);
  const weeklyCounts = new Map();
  for (const { brewed_at } of recentDates.rows) {
    const date = new Date(brewed_at);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const key = date.toISOString().slice(0, 10);
    weeklyCounts.set(key, (weeklyCounts.get(key) || 0) + 1);
  }
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) - (7 - index) * 7);
    const weekStart = date.toISOString().slice(0, 10);
    return { weekStart, count: weeklyCounts.get(weekStart) || 0 };
  });
  response(res, {
    totalBrews: Number(totals.rows[0].total_brews),
    totalBeans: Number(totals.rows[0].total_beans),
    avgRating: average.rows[0].value === null ? null : Math.round(average.rows[0].value * 10) / 10,
    favoriteMethod: favorite.rows[0]?.method || null,
    topBean: topBean.rows[0] ? { id: topBean.rows[0].id, name: topBean.rows[0].name, count: Number(topBean.rows[0].count) } : null,
    brewsPerWeek: weeks,
    methodBreakdown: breakdown.rows
  });
}));

export default router;
