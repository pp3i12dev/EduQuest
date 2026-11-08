import { passwordResetLimit } from '../middlewares/passwordResetLimit.middleware.js';
import { publicRegistrationLimit } from '../middlewares/publicRegistrationLimit.middleware.js';
import { Router } from 'express';
import { registerStudent, registerTeacher, registerStaff, resendVerification, verifyEmail, login, forgotPassword, confirmPasswordReset, registrationStatus } from '../controllers/auth.controller.js';

const router = Router();

// Solo devuelve disponibilidad: nunca revela credenciales ni envía correos.
router.get('/registration-status', registrationStatus);

// Límite IP: impide utilizar el correo de verificación para spam masivo.
router.post('/register-student', publicRegistrationLimit, registerStudent);
router.post('/register-staff', publicRegistrationLimit, registerStaff);
router.post('/resend-verification', publicRegistrationLimit, resendVerification);
router.post('/verify-email', publicRegistrationLimit, verifyEmail);
router.post('/register-teacher', registerTeacher);
router.post('/login', login);
router.post('/forgot-password', passwordResetLimit, forgotPassword);
router.post('/reset-password', passwordResetLimit, confirmPasswordReset);

export default router;