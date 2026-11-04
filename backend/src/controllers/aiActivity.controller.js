import * as service from '../services/aiActivity.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';
const action = fn => async (req, res) => {
  try { return res.json(await fn(req)); }
  catch (error) { return handleServiceError(error, res); }
};
export const preview = action(req => service.previewQuestions(req.user, req.body));
export const saveDraft = action(req => service.saveReviewedDraft(req.user, req.body));
export const publish = action(req => service.publishReviewedDraft(req.user, { ...req.body, activityId: req.params.activityId }));

export const editDraft = action(req => service.editReviewedDraft(req.user, req.params.activityId, req.body));

export const archive = action(req => service.archiveReviewedActivity(req.user, req.params.activityId, req.body));
