import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { listInvitations, createInvitation, cancelInvitation, acceptInvitation } from '../controllers/invitations.controller.js';

const router = Router();

// Público — sin authenticate, lo usa alguien que todavía no tiene cuenta
router.post('/:token/accept', acceptInvitation);

router.use(authenticate);
router.get('/', listInvitations);
router.post('/', createInvitation);
router.delete('/:id', cancelInvitation);

export default router;