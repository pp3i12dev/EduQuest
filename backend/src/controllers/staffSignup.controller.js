import { listStaffRequestsService, reviewStaffService } from '../services/publicRegistration.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';
export const listStaffRequests = async (req, res) => {
  try { return res.json(await listStaffRequestsService(req.user, req.query)); }
  catch (error) { return handleServiceError(error, res); }
};
export const reviewStaff = async (req, res) => {
  try { return res.json(await reviewStaffService(req.user, req.body)); }
  catch (error) { return handleServiceError(error, res); }
};
