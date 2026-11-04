
import { Router } from 'express';

import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { signupController } from '../controllers/studentSignup.controller.js';

import {
    listUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    getUserRoles,
    updateUserRoles,
    getMyProfile,
    updateMyProfile,
    changeMyPassword,
} from '../controllers/users.controller.js';

const router = Router();

// Todas las rutas requieren autenticación.
router.use(authenticate);

// ======================================================
// MI PERFIL
// Disponibles para cualquier usuario autenticado.
// ======================================================

// Consultar mis datos personales.
router.get('/me', getMyProfile);

// Actualizar mis datos personales.
router.patch('/me', updateMyProfile);

// Cambiar mi contraseña.
router.patch('/me/password', changeMyPassword);

// ======================================================
// ADMINISTRACIÓN DE USUARIOS
// Se mantienen las rutas originales.
// Los permisos se verifican en los servicios.
// ======================================================

// Solicitudes de alta pública de alumnos, en Gestión de usuarios.
// Requiere permiso de dirección o preceptoría; no puede usarse desde cuentas docentes.
router.get('/signup-requests', requirePermission('selfSignup:approve'), signupController.list);
router.get('/signup-requests/groups', requirePermission('selfSignup:approve'), signupController.groups);
router.post('/signup-requests/approve', requirePermission('selfSignup:approve'), signupController.approve);
router.post('/signup-requests/reject', requirePermission('selfSignup:approve'), signupController.reject);

// Listar usuarios.
router.get('/', listUsers);

// Crear usuario.
router.post('/', createUser);

// Actualizar usuario por ID.
router.put('/:id', updateUser);

// Activar o desactivar usuario.
router.patch('/:id/status', toggleUserStatus);

// Eliminar usuario.
router.delete('/:id', deleteUser);

// Consultar roles de un usuario.
router.get('/:id/roles', getUserRoles);

// Modificar roles de un usuario.
router.patch('/:id/roles', updateUserRoles);

export default router;
