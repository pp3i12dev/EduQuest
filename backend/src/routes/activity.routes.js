import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { list, getOne, create, update } from '../controllers/activity.controller.js';

const router = Router();
router.use(authenticate, requirePermission('activity:manage'));

router.get('/', list);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);

export default router;