
import { Router } from 'express';

import { authenticate } from '../middlewares/auth.middleware.js';

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
