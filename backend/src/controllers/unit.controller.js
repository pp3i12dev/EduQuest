import { listUnits, createUnit } from '../services/unit.service.js';
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
        return res.json(await listUnits(req.user, parseId(req.query.teacherSubjectId)));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const create = async (req, res) => {
    try {
        const { teacherSubjectId, title, description, activityIds } = req.body ?? {};
        const unit = await createUnit(req.user, {
            teacherSubjectId: parseId(teacherSubjectId),
            title,
            description,
            activityIds,
        });
        return res.status(201).json(unit);
    } catch (error) {
        return handleServiceError(error, res);
    }
};