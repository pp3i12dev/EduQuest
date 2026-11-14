import { Router } from 'express';
import { deviceController } from '../controllers/device.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las peticiones de dispositivos requieren estar autenticadas con JWT
router.use(authenticate);

// POST /api/devices -> Registra o actualiza el token FCM del usuario
router.post('/', deviceController.registerDevice);

export default router;