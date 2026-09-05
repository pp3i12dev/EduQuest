import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
// import { createStudent, ... } from '../controllers/users.controller.js';

const router = Router();

router.use(authenticate);

router.post('/students', requirePermission('student:create'), /* createStudent */ (req, res) => res.status(501).end());
router.delete('/students/:id', requirePermission('student:delete'), (req, res) => res.status(501).end());
router.post('/staff/invite', requirePermission('staff:invite'), (req, res) => res.status(501).end());
// etc.