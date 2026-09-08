import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { listCareers, createCareer, updateCareer, deleteCareer } from '../controllers/career.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', listCareers);
router.post('/', createCareer);
router.put('/:id', updateCareer);
router.delete('/:id', deleteCareer);

export default router;