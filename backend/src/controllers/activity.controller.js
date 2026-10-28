import {
    createQuizActivityService,
    getQuizActivityService,
    updateQuizActivityService,
} from '../services/activity.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

export const createQuizActivity = async (req, res) => {
    try {
        const result = await createQuizActivityService(req.user, req.body);
        return res.status(201).json(result);
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const getQuizActivity = async (req, res) => {
    try {
        const activity = await getQuizActivityService(req.user, req.params.id);
        return res.json(activity);
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateQuizActivity = async (req, res) => {
    try {
        const result = await updateQuizActivityService(req.user, req.params.id, req.body);
        return res.json(result);
    } catch (error) {
        return handleServiceError(error, res);
    }
};
