import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
    listInvitations, createInvitation, cancelInvitation,
    acceptInvitation, getInvitationByToken,
} from '../controllers/invitations.controller.js';

const router = Router();

// Públicas: las usa alguien que todavía no tiene cuenta
router.get('/:token', getInvitationByToken);
router.post('/:token/accept', acceptInvitation);

router.use(authenticate);
router.get('/', listInvitations);
router.post('/', createInvitation);
router.delete('/:id', cancelInvitation);

export default router;