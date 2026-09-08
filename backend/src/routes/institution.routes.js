import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getMyInstitution, updateMyInstitution } from '../controllers/institution.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', getMyInstitution);
router.put('/', updateMyInstitution);

export default router;