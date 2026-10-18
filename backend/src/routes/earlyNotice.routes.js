
import { Router } from 'express';

import { authenticate } from '../middlewares/auth.middleware.js';

import {
    earlyNoticeController as controller,
} from '../controllers/earlyNotice.controller.js';

import { earlyNoticeHistoryController } from '../controllers/earlyNoticeHistory.controller.js';

const router = Router();

/**
 * Todas las rutas de Avisos Tempranos
 * requieren una sesión autenticada.
 */
router.use(authenticate);

/**
 * GET /api/early-notices/options
 *
 * Opciones disponibles para crear avisos:
 * - Instituciones
 * - Cursos
 * - Materias
 * - Asignaciones docentes vigentes
 * - Horarios
 *
 * Los permisos se validan en el servicio.
 *
 * IMPORTANTE:
 * Esta ruta debe declararse antes de /:id.
 */
router.get(
    '/options',
    controller.getCreationOptions
);

/**
 * GET /api/early-notices
 *
 * Listar avisos tempranos.
 */
router.get(
    '/',
    controller.list
);

/**
 * GET /api/early-notices/:id
 *
 * Consultar un aviso específico.
 */
router.get(
    '/:id/history',
    earlyNoticeHistoryController.getHistory
);

router.get(
    '/:id',
    controller.getById
);

/**
 * POST /api/early-notices
 *
 * Crear un aviso temprano.
 */
router.post('/multi', controller.createMultiple);

router.post(
    '/',
    controller.create
);

/**
 * PATCH /api/early-notices/:id
 *
 * Editar un aviso existente.
 */
router.patch(
    '/:id',
    controller.update
);

/**
 * PATCH /api/early-notices/:id/confirm
 *
 * Confirmar un aviso pendiente.
 */
router.patch(
    '/:id/confirm',
    controller.confirm
);

/**
 * PATCH /api/early-notices/:id/reject
 *
 * Rechazar un aviso pendiente.
 */
router.patch(
    '/:id/reject',
    controller.reject
);

/**
 * PATCH /api/early-notices/:id/deactivate
 *
 * Desactivar un aviso sin eliminarlo.
 */
router.patch(
    '/:id/deactivate',
    controller.deactivate
);

export default router;
