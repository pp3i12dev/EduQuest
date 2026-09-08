import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { listSubjects, createSubject, updateSubject, deleteSubject } from '../controllers/subject.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', listSubjects);
router.post('/', createSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

export default router;