import { Router } from 'express';
import mongoose from 'mongoose';
import Bean from '../models/Bean.js';
import Brew from '../models/Brew.js';
import { asyncHandler, badRequest, response } from '../middleware/errors.js';
import { getHealth, getMethods } from '../controllers/meta.js';
import { beanSchema, brewSchema } from '../validators/api.js';

const router = Router();
const parse = (schema, input) => schema.parse(input);
const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const checkId = id => { if (!mongoose.isValidObjectId(id)) throw badRequest('Format ID tidak valid'); };
const findOr404 = async (Model, id) => {
  checkId(id);
  const item = await Model.findById(id);
  if (!item) throw Object.assign(new Error('Data tidak ditemukan'), { status: 404 });
  return item;
};
const pageParams = query => ({ page: Math.max(1, Number(query.page) || 1), limit: Math.min(50, Math.max(1, Number(query.limit) || 10)) });

router.get('/health', getHealth);
router.get('/methods', getMethods);

router.get('/beans', asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const filter = {};
  if (req.query.q) filter.$or = ['name', 'origin', 'roaster'].map(key => ({ [key]: { $regex: escapeRegex(req.query.q), $options: 'i' } }));
  if (req.query.process) filter.process = req.query.process;
  if (req.query.roastLevel) filter.roastLevel = req.query.roastLevel;
  const sort = req.query.sort === 'name' ? { name: 1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([Bean.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(), Bean.countDocuments(filter)]);
  const counts = await Brew.aggregate([{ $match: { bean: { $in: items.map(item => item._id) } } }, { $group: { _id: '$bean', count: { $sum: 1 } } }]);
  const countMap = new Map(counts.map(item => [String(item._id), item.count]));
  response(res, items.map(item => ({ ...item, id: String(item._id), _id: undefined, __v: undefined, brewCount: countMap.get(String(item._id)) || 0 })), 'Berhasil', { page, limit, total, totalPages: Math.ceil(total / limit) });
}));
router.post('/beans', asyncHandler(async (req, res) => response(res, await Bean.create(parse(beanSchema, req.body)), 'Biji berhasil ditambahkan', undefined, 201)));
router.get('/beans/:id', asyncHandler(async (req, res) => {
  const bean = await findOr404(Bean, req.params.id);
  const [brewCount, average, recentBrews] = await Promise.all([
    Brew.countDocuments({ bean: bean._id }),
    Brew.aggregate([{ $match: { bean: bean._id } }, { $group: { _id: null, value: { $avg: '$rating' } } }]),
    Brew.find({ bean: bean._id }).sort({ brewedAt: -1 }).limit(5).populate('bean', 'name origin')
  ]);
  response(res, { ...bean.toJSON(), brewCount, avgRating: average.length ? Math.round(average[0].value * 10) / 10 : null, recentBrews });
}));
router.put('/beans/:id', asyncHandler(async (req, res) => {
  const bean = await findOr404(Bean, req.params.id);
  bean.set(parse(beanSchema.partial(), req.body));
  await bean.save();
  response(res, bean, 'Biji berhasil diperbarui');
}));
router.delete('/beans/:id', asyncHandler(async (req, res) => {
  const bean = await findOr404(Bean, req.params.id);
  const count = await Brew.countDocuments({ bean: bean._id });
  if (count) throw Object.assign(new Error(`Biji ini masih dipakai ${count} seduhan`), { status: 409 });
  await bean.deleteOne();
  response(res, null, 'Biji berhasil dihapus');
}));

router.get('/brews', asyncHandler(async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const filter = {};
  if (req.query.method) filter.method = req.query.method;
  if (req.query.beanId) { checkId(req.query.beanId); filter.bean = req.query.beanId; }
  if (req.query.minRating) filter.rating = { $gte: Number(req.query.minRating) };
  if (req.query.favorite === 'true') filter.isFavorite = true;
  if (req.query.q) filter.$or = [{ notes: { $regex: escapeRegex(req.query.q), $options: 'i' } }, { tasteTags: { $regex: escapeRegex(req.query.q), $options: 'i' } }];
  const sort = req.query.sort === 'oldest' ? { brewedAt: 1 } : req.query.sort === 'rating' ? { rating: -1, brewedAt: -1 } : { brewedAt: -1 };
  const [items, total] = await Promise.all([Brew.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate('bean', 'name origin'), Brew.countDocuments(filter)]);
  response(res, items, 'Berhasil', { page, limit, total, totalPages: Math.ceil(total / limit) });
}));
router.post('/brews', asyncHandler(async (req, res) => {
  const data = parse(brewSchema, req.body);
  checkId(data.bean);
  if (!await Bean.exists({ _id: data.bean })) throw Object.assign(new Error('Biji kopi tidak ditemukan'), { status: 404 });
  response(res, await (await Brew.create(data)).populate('bean', 'name origin'), 'Seduhan berhasil ditambahkan', undefined, 201);
}));
router.get('/brews/:id', asyncHandler(async (req, res) => response(res, await Brew.findById((await findOr404(Brew, req.params.id))._id).populate('bean'))));
router.put('/brews/:id', asyncHandler(async (req, res) => {
  const brew = await findOr404(Brew, req.params.id);
  const data = parse(brewSchema.partial(), req.body);
  if (data.bean) { checkId(data.bean); if (!await Bean.exists({ _id: data.bean })) throw Object.assign(new Error('Biji kopi tidak ditemukan'), { status: 404 }); }
  brew.set(data);
  await brew.save();
  response(res, await brew.populate('bean', 'name origin'), 'Seduhan berhasil diperbarui');
}));
router.patch('/brews/:id/favorite', asyncHandler(async (req, res) => {
  const brew = await findOr404(Brew, req.params.id);
  brew.isFavorite = !brew.isFavorite;
  await brew.save();
  response(res, await brew.populate('bean', 'name origin'), 'Favorit diperbarui');
}));
router.delete('/brews/:id', asyncHandler(async (req, res) => { const brew = await findOr404(Brew, req.params.id); await brew.deleteOne(); response(res, null, 'Seduhan berhasil dihapus'); }));

router.get('/stats', asyncHandler(async (req, res) => {
  const [totalBrews, totalBeans, averages, favorite, topBean, breakdown, weekly] = await Promise.all([
    Brew.countDocuments(), Bean.countDocuments(), Brew.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
    Brew.aggregate([{ $group: { _id: '$method', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 1 }]),
    Brew.aggregate([{ $group: { _id: '$bean', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 1 }, { $lookup: { from: 'beans', localField: '_id', foreignField: '_id', as: 'bean' } }, { $unwind: { path: '$bean', preserveNullAndEmptyArrays: true } }]),
    Brew.aggregate([{ $group: { _id: '$method', count: { $sum: 1 } } }]),
    Brew.aggregate([{ $match: { brewedAt: { $gte: new Date(Date.now() - 56 * 86400000) } } }, { $group: { _id: { $dateTrunc: { date: '$brewedAt', unit: 'week', startOfWeek: 'monday' } }, count: { $sum: 1 } } }])
  ]);
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ((date.getDay() + 6) % 7) - (7 - index) * 7);
    const match = weekly.find(item => new Date(item._id).toDateString() === date.toDateString());
    return { weekStart: date.toISOString().slice(0, 10), count: match?.count || 0 };
  });
  response(res, {
    totalBrews, totalBeans, avgRating: averages.length ? Math.round(averages[0].avg * 10) / 10 : null,
    favoriteMethod: favorite[0]?._id || null,
    topBean: topBean[0]?.bean ? { id: String(topBean[0]._id), name: topBean[0].bean.name, count: topBean[0].count } : null,
    brewsPerWeek: weeks, methodBreakdown: breakdown
  });
}));

export default router;
