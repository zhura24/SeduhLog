export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Rute tidak ditemukan', errors: [] });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.name === 'ZodError') {
    return res.status(400).json({ success: false, message: 'Data yang dimasukkan belum valid', errors: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Data yang dimasukkan belum valid', errors: Object.values(error.errors).map(item => ({ field: item.path, message: item.message })) });
  }
  const status = error.status || 500;
  if (status === 500) console.error(error.message);
  res.status(status).json({ success: false, message: status === 500 && process.env.NODE_ENV === 'production' ? 'Terjadi kesalahan pada server' : error.message, errors: error.errors || [] });
}

export const response = (res, data, message = 'Berhasil', meta, status = 200) => res.status(status).json({ success: true, data, ...(meta ? { meta } : {}), message });
export const badRequest = message => Object.assign(new Error(message), { status: 400 });
