
import {
    listUsersService,
    createUserService,
    updateUserService,
    toggleUserStatusService,
    deleteUserService,
    getUserWithRolesService,
    updateUserRolesService,
    getMyProfileService,
    updateMyProfileService,
    changeMyPasswordService,
} from '../services/users.service.js';

import { handleServiceError } from '../utils/handleServiceError.js';

// ======================================================
// ADMINISTRACIÓN DE USUARIOS
// ======================================================

export const listUsers = async (req, res) => {
    try {
        return res.json(
            await listUsersService(req.query.role, req.user)
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const createUser = async (req, res) => {
    try {
        const { role, ...body } = req.body;

        return res.status(201).json(
            await createUserService(role, body, req.user)
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateUser = async (req, res) => {
    try {
        return res.json(
            await updateUserService(
                req.query.role,
                req.params.id,
                req.body,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        return res.json(
            await toggleUserStatusService(
                req.query.role,
                req.params.id,
                req.body.isActive,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const deleteUser = async (req, res) => {
    try {
        await deleteUserService(
            req.query.role,
            req.params.id,
            req.user
        );

        return res.status(204).end();
    } catch (error) {
        return handleServiceError(error, res);
    }
};

// ======================================================
// ADMINISTRACIÓN DE ROLES
// ======================================================

export const getUserRoles = async (req, res) => {
    try {
        return res.json(
            await getUserWithRolesService(
                req.params.id,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateUserRoles = async (req, res) => {
    try {
        return res.json(
            await updateUserRolesService(
                req.params.id,
                req.body.roles,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

// ======================================================
// MI PERFIL - USUARIO AUTENTICADO
// ======================================================

/**
 * GET /api/users/me
 *
 * Devuelve los datos personales del usuario
 * que inició sesión.
 *
 * No recibe un ID desde el frontend.
 */
export const getMyProfile = async (req, res) => {
    try {
        const profile = await getMyProfileService(req.user);

        return res.status(200).json(profile);
    } catch (error) {
        return handleServiceError(error, res);
    }
};

/**
 * PATCH /api/users/me
 *
 * Actualiza únicamente los campos personales
 * permitidos por el servicio.
 */
export const updateMyProfile = async (req, res) => {
    try {
        const updatedProfile = await updateMyProfileService(
            req.body,
            req.user
        );

        return res.status(200).json(updatedProfile);
    } catch (error) {
        return handleServiceError(error, res);
    }
};

/**
 * PATCH /api/users/me/password
 *
 * Verifica la contraseña actual antes
 * de permitir establecer una nueva.
 */
export const changeMyPassword = async (req, res) => {
    try {
        const result = await changeMyPasswordService(
            req.body,
            req.user
        );

        return res.status(200).json(result);
    } catch (error) {
        return handleServiceError(error, res);
    }
};
