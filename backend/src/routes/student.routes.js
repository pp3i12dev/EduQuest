import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import * as controller from '../controllers/student.controller.js';

const router = Router();
router.use(authenticate, requirePermission('game:play'));
router.get('/dashboard', controller.dashboard);
router.get('/subjects', controller.subjects);
router.get('/subjects/:assignmentId/activities', controller.activities);
router.get('/history', controller.history);
router.get('/activities/:activityId/play', controller.play);
router.post('/activities/:activityId/complete', controller.complete);
router.get('/practice/games', controller.practiceGames);
router.get('/practice/questions', controller.practiceQuestions);
router.post('/practice/check', controller.practiceCheck);
export default router;
