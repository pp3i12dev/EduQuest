import {
    listMyActivities,
    getMyActivity,
    createDraft,
    updateDraft,
} from '../services/activity.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

const parseId = (value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        const error = new Error('Id inválido');
        error.status = 400;
        throw error;
    }
    return id;
};

export const list = async (req, res) => {
    try {
        return res.json(await listMyActivities(req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const getOne = async (req, res) => {
    try {
        return res.json(await getMyActivity(req.user, parseId(req.params.id)));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const create = async (req, res) => {
    try {
        return res.status(201).json(await createDraft(req.user, req.body));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const update = async (req, res) => {
    try {
        return res.json(await updateDraft(req.user, parseId(req.params.id), req.body));
    } catch (error) {
        return handleServiceError(error, res);
    }
};