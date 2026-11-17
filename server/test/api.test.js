import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../src/app.js';
import Bean from '../src/models/Bean.js';
import Brew from '../src/models/Brew.js';

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
beforeEach(async () => { await Brew.deleteMany({}); await Bean.deleteMany({}); });
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });

describe('SeduhLog API', () => {
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
    await request(app).post('/api/beans').send({ name: 'x', origin: '' }).expect(400);
  });
  it('mencegah penghapusan biji yang masih digunakan', async () => {
    const bean = await Bean.create({ name: 'Kopi Gayo', origin: 'Aceh' });
    await Brew.create({ bean: bean._id, method: 'v60', doseGrams: 15, waterGrams: 240, rating: 4 });
    const result = await request(app).delete(`/api/beans/${bean.id}`).expect(409);
    expect(result.body.message).toMatch(/masih dipakai 1 seduhan/);
  });
  it('membuat, menampilkan, dan mengganti status favorit seduhan', async () => {
    const bean = await Bean.create({ name: 'Kopi Gayo', origin: 'Aceh' });
    const created = await request(app).post('/api/brews').send({
      bean: bean.id, method: 'v60', doseGrams: 15, waterGrams: 240, rating: 5, cupping: { aroma: 8, flavor: 9 }
    }).expect(201);
    expect(created.body.data.ratio).toBe(16);
    expect(created.body.data.cuppingAverage).toBe(8.5);
    expect(created.body.data.bean.name).toBe('Kopi Gayo');
    const updated = await request(app).patch(`/api/brews/${created.body.data.id}/favorite`).expect(200);
    expect(updated.body.data.isFavorite).toBe(true);
    expect((await request(app).get(`/api/brews/${created.body.data.id}`)).body.data.bean.origin).toBe('Aceh');
    await request(app).put(`/api/brews/${created.body.data.id}`).send({ rating: 4 }).expect(200);
    expect((await request(app).get(`/api/brews/${created.body.data.id}`)).body.data.rating).toBe(4);
    await request(app).delete(`/api/brews/${created.body.data.id}`).expect(200);
  });
  it('menolak cupping score di luar rentang', async () => {
    const bean = await Bean.create({ name: 'Kopi Gayo', origin: 'Aceh' });
    await request(app).post('/api/brews').send({
      bean: bean.id, method: 'v60', doseGrams: 15, waterGrams: 240, rating: 4, cupping: { aroma: 11 }
    }).expect(400);
  });
  it('menyediakan statistik dan 404 untuk data yang tidak ada', async () => {
    expect((await request(app).get('/api/stats')).body.data.totalBrews).toBe(0);
    await request(app).get(`/api/beans/${new mongoose.Types.ObjectId()}`).expect(404);
  });
  it('menolak format ID yang tidak valid', async () => {
    await request(app).get('/api/brews/nope').expect(400);
  });
});
