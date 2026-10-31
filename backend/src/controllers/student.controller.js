import * as service from '../services/student.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

const action = callback => async (req, res) => {
  try { return res.json(await callback(req)); }
  catch (error) { return handleServiceError(error, res); }
};
export const dashboard = action(req => service.dashboard(req.user));
export const subjects = action(req => service.subjects(req.user));
export const activities = action(req => service.activities(req.user, req.params.assignmentId));
export const history = action(req => service.history(req.user));
export const play = action(req => service.play(req.user, req.params.activityId));
export const complete = action(req => service.complete(req.user, req.params.activityId, req.body));
export const practiceGames = action(req => service.practiceGames(req.user));
export const practiceQuestions = action(req => service.practiceQuestions(req.user, req.query.gameType));
export const practiceCheck = action(req => service.practiceCheck(req.user, req.body));
