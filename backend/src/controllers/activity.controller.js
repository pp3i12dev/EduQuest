import {
    createDraft,
    getMyActivity,
    listMyActivities,
    setActivityStatus,
    updateDraft,
} from '../services/activity.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

const action = (callback, status = 200) => async (req, res) => {
    try {
        return res.status(status).json(await callback(req));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const parseId = value => {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        const error = new Error('Id inválido');
        error.status = 400;
        throw error;
    }
    return id;
};

export const list = action(req => listMyActivities(req.user));
export const getOne = action(req => getMyActivity(req.user, parseId(req.params.id)));
export const create = action(req => createDraft(req.user, req.body), 201);
export const update = action(req => updateDraft(req.user, parseId(req.params.id), req.body));
export const changeStatus = action(req => setActivityStatus(
    req.user,
    parseId(req.params.id),
    req.body?.status,
    req.body?.teacherSubjectIds,
));
