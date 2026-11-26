import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import * as controller from '../controllers/student.controller.js';
import { downloadStudent } from '../controllers/studyMaterial.controller.js';
import * as avatarController from '../controllers/studentAvatar.controller.js';
import { studentLeaderboard } from '../controllers/leaderboard.controller.js';

const router = Router();
router.use(authenticate, requirePermission('game:play'));
router.get('/dashboard', controller.dashboard);
router.get('/leaderboard', studentLeaderboard);
router.get('/avatar', avatarController.getMyAvatar);
router.patch('/avatar', avatarController.updateMyAvatar);
router.get('/subjects', controller.subjects);
router.get('/subjects/:assignmentId/activities', controller.activities);
router.get('/history', controller.history);
router.get('/history/:attemptId', controller.historyDetail);
// Nuevo endpoint destructivo separado: los clientes antiguos siguen pudiendo OCULTAR.
router.delete('/history/:attemptId/permanent', controller.deleteHistoryPermanently);
router.delete('/history/:attemptId', controller.hideHistoryItem);
router.get('/subjects/:assignmentId/content', controller.contentTree);
router.get('/materials/:id/file', downloadStudent);
router.get('/activities/:activityId/play', controller.play);
router.post('/activities/:activityId/complete', controller.complete);
router.get('/practice/games', controller.practiceGames);
router.get('/practice/questions', controller.practiceQuestions);
router.post('/practice/check', controller.practiceCheck);
export default router;
