import activityService from '../services/activity.service.js';

export const saveDraft = async (req, res, next) => {
  try {
    const activity = await activityService.saveDraft(req.user.id, req.body);
    res.status(200).json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
};