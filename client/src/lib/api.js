const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export async function api(path, options = {}) {
  const method = options.method || 'GET';
  if (method !== 'GET' && !navigator.onLine) throw new ApiError('Tidak bisa menyimpan saat offline', 0);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new ApiError(result.message || 'Permintaan gagal', response.status, result.errors || []);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('Server sedang bangun, mohon tunggu sebentar...', 408);
    if (error instanceof ApiError) throw error;
    throw new ApiError(navigator.onLine ? 'Server sedang bangun, mohon tunggu sebentar...' : 'Koneksi internet sedang offline', 0);
  } finally {
    clearTimeout(timeout);
  }
}

export const jsonBody = data => JSON.stringify(data);
