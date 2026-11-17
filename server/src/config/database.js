import mongoose from 'mongoose';

let connectionPromise;

export function connectDatabase(uri) {
  if (!uri) return Promise.reject(new Error('MONGODB_URI belum dikonfigurasi'));
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }).catch(error => {
      connectionPromise = undefined;
      throw error;
    });
  }
  return connectionPromise;
}
