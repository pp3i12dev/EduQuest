import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { listUsers, createUser, updateUser, toggleUserStatus, deleteUser, getUserRoles, updateUserRoles } from '../controllers/users.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);
router.delete('/:id', deleteUser);
router.get('/:id/roles', getUserRoles);
router.patch('/:id/roles', updateUserRoles);

export default router;