import { findTeacherProfileByUserId } from '../repositories/teacherSubject.repository.js';
import {
    createActivity,
    updateActivity,
    findActivityById,
    findActivitiesByTeacher,
} from '../repositories/activity.repository.js';

const GAME_TYPE = 'true_false';

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const getTeacherProfile = async (userId) => {
    const profile = await findTeacherProfileByUserId(userId);
    if (!profile) throw httpError(403, 'El usuario no es profesor');
    return profile;
};

const cleanStatements = (content) => {
    const statements = content?.statements;
    if (!Array.isArray(statements) || statements.length === 0) {
        throw httpError(400, 'La actividad debe tener al menos una afirmación');
    }
    return statements.map((s, index) => {
        const text = typeof s?.text === 'string' ? s.text.trim() : '';
        if (!text) {
            throw httpError(400, `La afirmación ${index + 1} no puede estar vacía`);
        }
        if (typeof s.correctAnswer !== 'boolean') {
            throw httpError(400, `La afirmación ${index + 1} debe ser Verdadero o Falso`);
        }
        return { id: index + 1, text, correctAnswer: s.correctAnswer };
    });
};

const buildData = ({ title, description, content }) => {
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (!cleanTitle) throw httpError(400, 'El título es obligatorio');
    if (cleanTitle.length > 120) {
        throw httpError(400, 'El título no puede superar los 120 caracteres');
    }
    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    return {
        title: cleanTitle,
        description: cleanDescription || null,
        gameType: GAME_TYPE,
        content: { statements: cleanStatements(content) },
        status: 'DRAFT',
    };
};

const getOwnActivity = async (teacherId, activityId) => {
    const activity = await findActivityById(activityId);
    if (!activity) throw httpError(404, 'La actividad no existe');
    if (activity.teacherId !== teacherId) {
        throw httpError(403, 'No tenés permiso para esta actividad');
    }
    return activity;
};

export const listMyActivities = async (user) => {
    const teacher = await getTeacherProfile(user.id);
    return findActivitiesByTeacher(teacher.id);
};

export const getMyActivity = async (user, activityId) => {
    const teacher = await getTeacherProfile(user.id);
    return getOwnActivity(teacher.id, activityId);
};

export const createDraft = async (user, body) => {
    const teacher = await getTeacherProfile(user.id);
    return createActivity({ ...buildData(body ?? {}), teacherId: teacher.id });
};

export const updateDraft = async (user, activityId, body) => {
    const teacher = await getTeacherProfile(user.id);
    const activity = await getOwnActivity(teacher.id, activityId);
    if (activity.status !== 'DRAFT') {
        throw httpError(409, 'Solo se pueden editar actividades en borrador');
    }
    return updateActivity(activityId, buildData(body ?? {}));
};

// Una actividad nace como DRAFT. Publicarla la vuelve asignable a una materia;
// recién cuando esté vinculada a TeacherSubject aparece en Unity.
export const setActivityStatus = async (user, activityId, status) => {
    const teacher = await getTeacherProfile(user.id);
    const activity = await getOwnActivity(teacher.id, activityId);
    if (!['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'DRAFT'].includes(status))
        throw httpError(400, 'Estado de actividad inválido');
    if (status === 'ACTIVE') cleanStatements(activity.content);
    return updateActivity(activityId, { status });
};
