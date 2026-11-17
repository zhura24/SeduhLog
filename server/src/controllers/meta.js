import { methods } from '../data/methods.js';
import { response } from '../middleware/errors.js';

export function getHealth(req, res) {
  return response(res, { status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
}

export function getMethods(req, res) {
  return response(res, methods);
}
