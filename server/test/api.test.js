import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DataType, newDb } from 'pg-mem';
import request from 'supertest';
import app from '../src/app.js';
import { closePool, getPool, initializeDatabase, setPoolForTests } from '../src/db/pool.js';
import { seedDatabase } from '../src/seed.js';

let memoryPool;
beforeAll(async () => {
  const db = newDb();
  db.public.registerFunction({
    name: 'char_length',
    args: [DataType.text],
    returns: DataType.integer,
    implementation: value => value.length
  });
  const { Pool } = db.adapters.createPg();
  memoryPool = new Pool();
  setPoolForTests(memoryPool);
  await initializeDatabase();
});
beforeEach(async () => {
  await getPool().query('DELETE FROM brews');
  await getPool().query('DELETE FROM beans');
});
afterAll(async () => { await closePool(); });

async function addBean() {
  const { rows } = await getPool().query(
    `INSERT INTO beans (id, name, origin) VALUES ($1, 'Kopi Gayo', 'Aceh') RETURNING id`,
    [randomUUID()]
  );
  return rows[0].id;
}

describe('SeduhLog API', () => {
  it('menambahkan seed contoh hanya ke database kosong', async () => {
    const seeded = await seedDatabase();
    expect(seeded).toEqual({ seeded: true, beanCount: 17, brewCount: 50 });
    const counts = await getPool().query(
      'SELECT (SELECT COUNT(*)::int FROM beans) AS beans, (SELECT COUNT(*)::int FROM brews) AS brews'
    );
    expect(Number(counts.rows[0].beans)).toBe(17);
    expect(Number(counts.rows[0].brews)).toBe(50);
    expect((await seedDatabase()).seeded).toBe(false);
  });
  it('melayani health check', async () => {
    const { body } = await request(app).get('/api/health').expect(200);
    expect(body.data.status).toBe('ok');
  });
  it('membuat dan menampilkan biji kopi', async () => {
    const created = await request(app).post('/api/beans').send({ name: 'Kopi Gayo', origin: 'Aceh' }).expect(201);
    expect(created.body.data.id).toBeTruthy();
    expect((await request(app).get('/api/beans')).body.meta.total).toBe(1);
    await request(app).put(`/api/beans/${created.body.data.id}`).send({ name: 'Gayo Premium', origin: 'Aceh' }).expect(200);
    expect((await request(app).get(`/api/beans/${created.body.data.id}`)).body.data.name).toBe('Gayo Premium');
    await request(app).delete(`/api/beans/${created.body.data.id}`).expect(200);
  });
  it('menolak data biji tidak valid dengan 400', async () => {
    const result = await request(app).post('/api/beans').send({ name: 'x', origin: '' }).expect(400);
    expect(result.body.errors).toContainEqual({ field: 'name', message: 'Nama Biji Kopi minimal 2 karakter' });
  });
  it('mengarsipkan Biji Kopi beserta Seduhan terkait dan memulihkannya bersama', async () => {
    const bean = await addBean();
    const brew = await request(app).post('/api/brews').send({ bean, method: 'v60', doseGrams: 15, waterGrams: 240, grindSize: 'medium', rating: 4 }).expect(201);
    const archived = await request(app).delete(`/api/beans/${bean}`).expect(200);
    expect(archived.body.data.archivedBrews).toBe(1);
    expect((await request(app).get('/api/beans')).body.meta.total).toBe(0);
    expect((await request(app).get('/api/brews')).body.meta.total).toBe(0);
    expect((await request(app).get('/api/stats')).body.data.totalBrews).toBe(0);
    expect((await request(app).get('/api/stats')).body.data.totalBeans).toBe(0);
    expect((await request(app).get('/api/archive/beans')).body.meta.total).toBe(1);
    expect((await request(app).get('/api/archive/brews')).body.meta.total).toBe(1);
    await request(app).patch(`/api/archive/brews/${brew.body.data.id}/restore`).expect(409);
    await request(app).post('/api/brews').send({ bean, method: 'v60', doseGrams: 15, waterGrams: 240, rating: 4 }).expect(404);
    const restored = await request(app).patch(`/api/archive/beans/${bean}/restore`).expect(200);
    expect(restored.body.data.restoredBrews).toBe(1);
    expect((await request(app).get('/api/beans')).body.meta.total).toBe(1);
    expect((await request(app).get('/api/brews')).body.meta.total).toBe(1);
  });
  it('memulihkan dan menghapus permanen Seduhan melalui Arsip', async () => {
    const bean = await addBean();
    const brew = await request(app).post('/api/brews').send({
      bean, method: 'v60', doseGrams: 15, waterGrams: 240, grindSize: 'medium', rating: 4
    }).expect(201);
    const id = brew.body.data.id;
    await request(app).delete(`/api/brews/${id}`).expect(200);
    expect((await request(app).get('/api/archive/brews')).body.meta.total).toBe(1);
    await request(app).patch(`/api/archive/brews/${id}/restore`).expect(200);
    expect((await request(app).get('/api/brews')).body.meta.total).toBe(1);
    await request(app).delete(`/api/brews/${id}`).expect(200);
    await request(app).delete(`/api/archive/brews/${id}`).expect(200);
    expect((await request(app).get('/api/archive/brews')).body.meta.total).toBe(0);
  });
  it('tidak memulihkan Seduhan yang diarsipkan mandiri saat Biji Kopi dipulihkan', async () => {
    const bean = await addBean();
    const createBrew = () => request(app).post('/api/brews').send({
      bean, method: 'v60', doseGrams: 15, waterGrams: 240, grindSize: 'medium', rating: 4
    }).expect(201);
    const independentlyArchived = await createBrew();
    await createBrew();
    await request(app).delete(`/api/brews/${independentlyArchived.body.data.id}`).expect(200);
    await request(app).delete(`/api/beans/${bean}`).expect(200);
    await request(app).patch(`/api/archive/beans/${bean}/restore`).expect(200);
    expect((await request(app).get('/api/brews')).body.meta.total).toBe(1);
    expect((await request(app).get('/api/archive/brews')).body.meta.total).toBe(1);
    await request(app).patch(`/api/archive/brews/${independentlyArchived.body.data.id}/restore`).expect(200);
    expect((await request(app).get('/api/brews')).body.meta.total).toBe(2);
  });
  it('menghapus permanen Biji Kopi terarsip beserta Seduhan terkait', async () => {
    const bean = await addBean();
    await request(app).post('/api/brews').send({ bean, method: 'v60', doseGrams: 15, waterGrams: 240, grindSize: 'medium', rating: 4 }).expect(201);
    await request(app).delete(`/api/beans/${bean}`).expect(200);
    const result = await request(app).delete(`/api/archive/beans/${bean}`).expect(200);
    expect(result.body.data.deletedBrews).toBe(1);
    expect((await request(app).get('/api/archive/beans')).body.meta.total).toBe(0);
    expect((await request(app).get('/api/archive/brews')).body.meta.total).toBe(0);
  });
  it('menolak penghapusan permanen jika data belum masuk Arsip', async () => {
    const bean = await addBean();
    const brew = await request(app).post('/api/brews').send({
      bean, method: 'v60', doseGrams: 15, waterGrams: 240, grindSize: 'medium', rating: 4
    }).expect(201);
    await request(app).delete(`/api/archive/brews/${brew.body.data.id}`).expect(409);
    await request(app).delete(`/api/archive/beans/${bean}`).expect(404);
  });
  it('membuat, menampilkan, dan mengganti status favorit seduhan', async () => {
    const bean = await addBean();
    const created = await request(app).post('/api/brews').send({
      bean, method: 'v60', doseGrams: 15, waterGrams: 240, grindSize: 'medium', rating: 5, cupping: { aroma: 8, flavor: 9 }
    }).expect(201);
    expect(created.body.data.ratio).toBe(16);
    expect(created.body.data.cuppingAverage).toBe(8.5);
    expect(created.body.data.bean.name).toBe('Kopi Gayo');
    const beanDetail = (await request(app).get(`/api/beans/${bean}`).expect(200)).body.data;
    expect(beanDetail.brewCount).toBe(1);
    expect(beanDetail.avgRating).toBe(5);
    expect((await request(app).get('/api/beans').expect(200)).body.data[0].brewCount).toBe(1);
    const updated = await request(app).patch(`/api/brews/${created.body.data.id}/favorite`).expect(200);
    expect(updated.body.data.isFavorite).toBe(true);
    expect((await request(app).get(`/api/brews/${created.body.data.id}`)).body.data.bean.origin).toBe('Aceh');
    const listed = await request(app).get('/api/brews').query({ beanId: bean, favorite: 'true' }).expect(200);
    expect(listed.body.meta.total).toBe(1);
    expect(listed.body.data[0].bean.name).toBe('Kopi Gayo');
    const stats = (await request(app).get('/api/stats').expect(200)).body.data;
    expect(stats.totalBrews).toBe(1);
    expect(stats.topBean.count).toBe(1);
    expect(stats.methodBreakdown[0].count).toBe(1);
    await request(app).put(`/api/brews/${created.body.data.id}`).send({ rating: 4 }).expect(200);
    expect((await request(app).get(`/api/brews/${created.body.data.id}`)).body.data.rating).toBe(4);
    await request(app).delete(`/api/brews/${created.body.data.id}`).expect(200);
  });
  it('menolak cupping score di luar rentang', async () => {
    const bean = await addBean();
    const result = await request(app).post('/api/brews').send({
      bean, method: 'v60', doseGrams: 15, waterGrams: 240, rating: 4, cupping: { aroma: 11 }
    }).expect(400);
    expect(result.body.errors).toContainEqual({ field: 'cupping.aroma', message: 'Nilai aroma maksimal 10' });
  });
  it('menyediakan statistik dan 404 untuk data yang tidak ada', async () => {
    expect((await request(app).get('/api/stats')).body.data.totalBrews).toBe(0);
    await request(app).get(`/api/beans/${randomUUID()}`).expect(404);
  });
  it('menolak format ID yang tidak valid', async () => {
    await request(app).get('/api/brews/nope').expect(400);
  });
});
