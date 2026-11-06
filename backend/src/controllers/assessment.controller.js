import * as service from '../services/assessment.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';
const action = fn => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (error) { handleServiceError(error, res); }
};
export const assignments = action(req => service.assignments(req.user));
export const list = action(req => service.list(req.user, req.params.assignmentId, req.query));
export const filters = action(req => service.filters(req.user, req.params.assignmentId, req.query));
export const detail = action(req => service.detail(req.user, req.params.id));
export const archived = action(req => service.setArchived(req.user, req.params.id, req.body?.archived));
export const remove = action(req => service.removePermanently(req.user, req.params.id, req.body));
