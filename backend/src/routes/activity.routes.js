import { Router } from 'express';
import { saveDraft } from '../controllers/activity.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import permissionMiddleware from '../middlewares/permission.middleware.js';

const router = Router();

router.post('/', authMiddleware, permissionMiddleware('activity:manage'), saveDraft);
router.put('/:id', authMiddleware, permissionMiddleware('activity:manage'), saveDraft);

export default router;