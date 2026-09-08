import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { listUsers, createUser, updateUser, toggleUserStatus, deleteUser } from '../controllers/users.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);
router.delete('/:id', deleteUser);

export default router;