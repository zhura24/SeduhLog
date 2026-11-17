import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  if (!uri) throw new Error('MONGODB_URI belum dikonfigurasi');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}
