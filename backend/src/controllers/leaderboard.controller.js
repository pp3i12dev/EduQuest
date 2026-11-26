import * as service from '../services/leaderboard.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';
export async function studentLeaderboard(req, res) {
  try { res.json(await service.forStudent(req.user, req.query.assignmentId, req.query.activityId)); }
  catch (error) { handleServiceError(error, res); }
}
export async function teacherLeaderboard(req, res) {
  try { res.json(await service.forTeacher(req.user, req.params.assignmentId, req.query.activityId)); }
  catch (error) { handleServiceError(error, res); }
}
