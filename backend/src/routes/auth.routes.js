import { passwordResetLimit } from '../middlewares/passwordResetLimit.middleware.js';
import { Router } from 'express';
import { registerStudent, registerTeacher, login, forgotPassword, confirmPasswordReset } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register-student', registerStudent);
router.post('/register-teacher', registerTeacher);
router.post('/login', login);
router.post('/forgot-password', passwordResetLimit, forgotPassword);
router.post('/reset-password', passwordResetLimit, confirmPasswordReset);

export default router;