import {
    findUnitsByTeacherSubject,
    createUnitWithActivities,
    getUnitWithAssignment, getTopicWithUnit, createTopicRecord, updateTopicRecord,
} from '../repositories/unit.repository.js';
import { getTeacherSubjectDetail } from './teacherSubject.service.js';

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

export const listUnits = async (user, teacherSubjectId) => {
    await getTeacherSubjectDetail(user, teacherSubjectId); // valida existencia y permisos
    return findUnitsByTeacherSubject(teacherSubjectId);
};

export const createUnit = async (user, { teacherSubjectId, title, description, activityIds } = {}) => {
    const teacherSubject = await getTeacherSubjectDetail(user, teacherSubjectId);

        if (teacherSubject.isActive === false) {
        throw httpError(409, 'La materia no está vigente: no se pueden crear unidades.');
    }

    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (!cleanTitle) throw httpError(400, 'El título es obligatorio');
    if (cleanTitle.length > 120) throw httpError(400, 'El título no puede superar los 120 caracteres');

    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    if (Array.isArray(activityIds) && activityIds.length > 0) {
        throw httpError(400, 'No se vinculan juegos al crear la unidad: creá un tema y asigná la actividad a ese tema.');
    }

    return createUnitWithActivities({
        teacherSubjectId,
        title: cleanTitle,
        description: cleanDescription || null,
    });
};

const topicFields = (body = {}) => {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title || title.length > 120) throw httpError(400, 'El tema debe tener un título de hasta 120 caracteres.');
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (description.length > 1500) throw httpError(400, 'Descripción demasiado larga.');
    const position = body.position == null || body.position === '' ? null : Number(body.position);
    if (position !== null && (!Number.isSafeInteger(position) || position < 1 || position > 9999)) throw httpError(400, 'El orden del tema debe ser un número entero desde 1.');
    return { title, description: description || null, position };
};

async function editableUnit(user, unitId) {
    const unit = await getUnitWithAssignment(unitId);
    if (!unit) throw httpError(404, 'La unidad no existe.');
    const assignment = await getTeacherSubjectDetail(user, unit.teacherSubjectId);
    if (assignment.isActive === false) throw httpError(409, 'No se puede editar una asignación inactiva.');
    return unit;
}

export const createTopic = async (user, unitId, body) => {
    await editableUnit(user, unitId);
    return createTopicRecord({ unitId, ...topicFields(body) });
};

export const editTopic = async (user, unitId, topicId, body) => {
    const unit = await editableUnit(user, unitId);
    const topic = await getTopicWithUnit(topicId);
    if (!topic || topic.unitId !== unit.id) throw httpError(404, 'El tema no pertenece a esta unidad.');
    return updateTopicRecord(unitId, topicId, topicFields(body));
};
