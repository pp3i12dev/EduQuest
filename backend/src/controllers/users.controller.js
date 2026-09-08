import {
    listUsersService, createUserService, updateUserService,
    toggleUserStatusService, deleteUserService,
} from '../services/users.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

export const listUsers = async (req, res) => {
    try {
        return res.json(await listUsersService(req.query.role, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const createUser = async (req, res) => {
    try {
        const { role, ...body } = req.body;
        return res.status(201).json(await createUserService(role, body, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateUser = async (req, res) => {
    try {
        return res.json(await updateUserService(req.query.role, req.params.id, req.body, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        return res.json(await toggleUserStatusService(req.query.role, req.params.id, req.body.isActive, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const deleteUser = async (req, res) => {
    try {
        await deleteUserService(req.query.role, req.params.id, req.user);
        return res.status(204).end();
    } catch (error) {
        return handleServiceError(error, res);
    }
};