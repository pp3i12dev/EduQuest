import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { notificationController as controller } from '../controllers/notification.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/:id/read', controller.markRead);
export default router;
