import { Router } from 'express';

import { authenticate } from '../middlewares/auth.middleware.js';

import {
    listInstitutions,
    getInstitution,
    createInstitution,
    updateInstitutionAdmin,
    toggleInstitutionStatus,
    deleteInstitution,
} from '../controllers/institution.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listInstitutions);
router.get('/:id', getInstitution);
router.post('/', createInstitution);
router.put('/:id', updateInstitutionAdmin);
router.patch('/:id/status', toggleInstitutionStatus);
router.delete('/:id', deleteInstitution);

export default router;