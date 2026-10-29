import {
    findUnitsByTeacherSubject,
    createUnitWithActivities,
} from '../repositories/unit.repository.js';
import { getTeacherSubjectDetail } from './teacherSubject.service.js';

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const toIdList = (value) => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw httpError(400, 'activityIds debe ser una lista');
    const ids = value.map(Number);
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
        throw httpError(400, 'activityIds contiene ids inválidos');
    }
    return [...new Set(ids)];
};

export const listUnits = async (user, teacherSubjectId) => {
    await getTeacherSubjectDetail(user, teacherSubjectId); // valida existencia y permisos
    return findUnitsByTeacherSubject(teacherSubjectId);
};

export const createUnit = async (user, { teacherSubjectId, title, description, activityIds }) => {
    const teacherSubject = await getTeacherSubjectDetail(user, teacherSubjectId);

        if (teacherSubject.isActive === false) {
        throw httpError(409, 'La materia no está vigente: no se pueden crear unidades.');
    }

    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (!cleanTitle) throw httpError(400, 'El título es obligatorio');
    if (cleanTitle.length > 120) throw httpError(400, 'El título no puede superar los 120 caracteres');

    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    const ids = toIdList(activityIds);

    const validIds = new Set(teacherSubject.activities.map((a) => a.id));
    if (ids.some((id) => !validIds.has(id))) {
        throw httpError(400, 'Algún minijuego no pertenece a esta materia');
    }

    return createUnitWithActivities({
        teacherSubjectId,
        title: cleanTitle,
        description: cleanDescription || null,
        activityIds: ids,
    });
};