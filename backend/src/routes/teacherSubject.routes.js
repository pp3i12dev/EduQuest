import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { uploadContents } from '../middlewares/upload.middleware.js';
import { listMine, getDetail, listAssignable, edit } from '../controllers/teacherSubject.controller.js';

const router = Router();
router.use(authenticate, requirePermission('subjectContent:manage'));

router.get('/', listMine);
router.get('/:id', getDetail);
router.get('/:id/assignable-activities', listAssignable);
router.put('/:id', uploadContents, edit);

export default router;