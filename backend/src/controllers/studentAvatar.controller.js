import * as service from '../services/studentAvatar.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

export async function getMyAvatar(req, res) {
  try { return res.json(await service.getMyAvatar(req.user)); }
  catch (error) { return handleServiceError(error, res); }
}

export async function updateMyAvatar(req, res) {
  try { return res.json(await service.updateMyAvatar(req.user, req.body)); }
  catch (error) { return handleServiceError(error, res); }
}
