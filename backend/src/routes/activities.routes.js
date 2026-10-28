import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import {
    createQuizActivity,
    getQuizActivity,
    updateQuizActivity,
} from '../controllers/activity.controller.js';

const router = Router();

router.use(authenticate, requirePermission('subjectContent:manage'));
router.get('/:id', getQuizActivity);
router.post('/quiz', createQuizActivity);
router.put('/:id', updateQuizActivity);

export default router;
