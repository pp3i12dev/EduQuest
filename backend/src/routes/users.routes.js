
import { Router } from 'express';

import { authenticate, requirePermission } from '../middlewares/auth.middleware.js';
import { listStaffRequests, reviewStaff } from '../controllers/staffSignup.controller.js';
import { listDirectory, listDirectoryOptions, listDirectoryInstitutions, setDirectoryPrivacy } from '../controllers/directory.controller.js';

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
    updateMyLegajos,
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
// Cada persona puede completar sus legajos oficiales luego del alta.
router.patch('/me/legajos', updateMyLegajos);

// Cambiar mi contraseña.
router.patch('/me/password', changeMyPassword);
router.patch('/me/directory-privacy', setDirectoryPrivacy);

// Consulta segura de contactos institucionales (sin DNI, legajos ni alumnos).
router.get('/directory/institutions', listDirectoryInstitutions);
router.get('/directory/options', listDirectoryOptions);
router.get('/directory', listDirectory);

// ======================================================
// ADMINISTRACIÓN DE USUARIOS
// Se mantienen las rutas originales.
// Los permisos se verifican en los servicios.
// ======================================================

// Solicitudes de alta pública de PERSONAL, en Gestión de usuarios.
// Requiere permiso de dirección o preceptoría; no puede usarse desde cuentas docentes.
router.get('/staff-signup-requests', requirePermission('selfSignup:approve'), listStaffRequests);
router.post('/staff-signup-requests/review', requirePermission('selfSignup:approve'), reviewStaff);

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
