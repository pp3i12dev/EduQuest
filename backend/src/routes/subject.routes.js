import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { listSubjects, listSubjectGames, createSubject, updateSubject, setSubjectStatus, deleteSubject } from '../controllers/subject.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', listSubjects);
router.get('/games', listSubjectGames);
router.post('/', createSubject);
router.put('/:id', updateSubject);
router.patch('/:id/status', setSubjectStatus);
router.delete('/:id', deleteSubject);

export default router;