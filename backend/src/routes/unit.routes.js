import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { list, create } from '../controllers/unit.controller.js';

const router = Router();
router.use(authenticate, requirePermission('subjectContent:manage'));

router.get('/', list);
router.post('/', create);

export default router;