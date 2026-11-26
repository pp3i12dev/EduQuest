import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { create } from '../controllers/activity.controller.js';

const router = Router();

router.use(authenticate, requirePermission('subjectContent:manage'));
router.post('/quiz', create);

export default router;
