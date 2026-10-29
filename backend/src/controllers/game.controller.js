import { getTrueFalseGame, submitTrueFalseResults } from '../services/game.service.js';
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

export const getTrueFalse = async (req, res) => {
    try {
        return res.json(await getTrueFalseGame(req.user, parseId(req.params.activityId)));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const postTrueFalseResults = async (req, res) => {
    try {
        const result = await submitTrueFalseResults(req.user, parseId(req.params.activityId), req.body);
        return res.status(201).json(result);
    } catch (error) {
        return handleServiceError(error, res);
    }
};
