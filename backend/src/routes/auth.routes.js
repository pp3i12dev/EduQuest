import { Router } from 'express';
import { registerStudent, registerTeacher, login } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register/student', registerStudent);
router.post('/register/teacher', registerTeacher);
router.post('/login', login);

export default router;