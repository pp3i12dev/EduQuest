import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import * as ctrl from '../controllers/aiActivity.controller.js';
import { getGeminiSettings } from '../services/serviceConfig.service.js';
const router = Router();
router.use(authenticate, requirePermission('subjectContent:manage'));
router.get('/status', async (req, res) => {
  try {
    const data = await getGeminiSettings(req.user?.institutionId);
    res.json({ configured: Boolean(data), model: data?.model || null });
  } catch { res.json({ configured: false, model: null }); }
});
router.post('/preview', ctrl.preview);
router.post('/drafts', ctrl.saveDraft);
router.put('/drafts/:activityId', ctrl.editDraft);
router.post('/drafts/:activityId/publish', ctrl.publish);
router.delete('/activities/:activityId', ctrl.archive);
export default router;
