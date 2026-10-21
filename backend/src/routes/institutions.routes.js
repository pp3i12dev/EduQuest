
import { Router } from 'express';

import { authenticate } from '../middlewares/auth.middleware.js';

import {
    getMyInstitution,
    updateMyInstitution,
    listInstitutions,
    getInstitution,
    createInstitution,
    updateInstitutionAdmin,
    toggleInstitutionStatus,
    deleteInstitution,
} from '../controllers/institution.controller.js';

const router = Router();

router.use(authenticate);

// Institución propia.
// Un director puede consultar y editar su institución.
router.get('/me', getMyInstitution);
router.put('/me', updateMyInstitution);

// Administración global.
// El servicio verifica qué operaciones corresponden
// exclusivamente al SUPER_ADMIN.
router.get('/', listInstitutions);
router.get('/:id', getInstitution);
router.post('/', createInstitution);
router.put('/:id', updateInstitutionAdmin);
router.patch('/:id/status', toggleInstitutionStatus);
router.delete('/:id', deleteInstitution);

export default router;
