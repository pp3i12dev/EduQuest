import { getPrisma } from '../config/prisma.js';

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const toNumber = (value, fieldName) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw httpError(400, `${fieldName} debe ser un entero positivo`);
    }

    return parsed;
};

const ensureTeacherProfile = async (prisma, user, teacherIdInput) => {
    const teacherProfileId = toNumber(teacherIdInput ?? user.id, 'teacherId');

    if (!teacherProfileId) {
        throw httpError(400, 'Falta el teacherId');
    }

    let teacherProfile = await prisma.teacherProfile.findUnique({
        where: { id: teacherProfileId },
    });

    if (!teacherProfile) {
        teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: teacherProfileId },
        });
    }

    if (!teacherProfile) {
        throw httpError(403, 'El usuario no es profesor o el teacherId no es válido');
    }

    const isSuperAdmin = user?.isSuperAdmin === true;
    const isManager = ['DIRECTOR', 'PRECEPTOR'].includes((user?.roles ?? [])[0]) ||
        (user?.roles ?? []).some((role) => ['DIRECTOR', 'PRECEPTOR'].includes(role));

    if (!isSuperAdmin && !isManager && teacherProfile.userId !== user.id) {
        throw httpError(403, 'No tenés permisos para crear actividades para este profesor');
    }

    return teacherProfile;
};

const ensureTeacherSubject = async (prisma, teacherSubjectId, teacherProfile) => {
    if (teacherSubjectId === undefined || teacherSubjectId === null || teacherSubjectId === '') {
        return null;
    }

    const parsedId = toNumber(teacherSubjectId, 'teacherSubjectId');

    const teacherSubject = await prisma.teacherSubject.findUnique({
        where: { id: parsedId },
        include: { teacher: true },
    });

    if (!teacherSubject) {
        throw httpError(404, 'La asignación docente no existe');
    }

    if (teacherSubject.teacherId !== teacherProfile.id) {
        throw httpError(403, 'La asignación docente no pertenece a este profesor');
    }

    return teacherSubject;
};

const normalizeOptions = (rawOptions) => {
    if (!Array.isArray(rawOptions) || rawOptions.length < 2 || rawOptions.length > 4) {
        throw httpError(400, 'Debés enviar entre 2 y 4 opciones');
    }

    const normalized = rawOptions.map((option, index) => {
        if (!option || typeof option !== 'object') {
            throw httpError(400, `La opción ${index + 1} no es válida`);
        }

        const text = typeof option.text === 'string' ? option.text.trim() : '';
        if (!text) {
            throw httpError(400, `La opción ${index + 1} no puede estar vacía`);
        }

        return {
            text,
            isCorrect: Boolean(option.isCorrect),
        };
    });

    const correctCount = normalized.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
        throw httpError(400, 'Debe haber exactamente una opción correcta');
    }

    return normalized;
};

const normalizeQuestions = (rawQuestions) => {
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        throw httpError(400, 'Debés enviar al menos una pregunta');
    }

    return rawQuestions.map((question, questionIndex) => {
        if (!question || typeof question !== 'object') {
            throw httpError(400, `La pregunta ${questionIndex + 1} no es válida`);
        }

        const text = typeof question.text === 'string' ? question.text.trim() : '';
        if (!text) {
            throw httpError(400, `La pregunta ${questionIndex + 1} no puede estar vacía`);
        }

        return {
            text,
            options: normalizeOptions(question.options),
        };
    });
};

const getActivityWithAccess = async (prisma, user, activityId) => {
    const parsedId = toNumber(activityId, 'activityId');

    const activity = await prisma.activity.findUnique({
        where: { id: parsedId },
    });

    if (!activity) {
        throw httpError(404, 'La actividad no existe');
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: user.id },
    });

    const userIsOwner = teacherProfile && activity.teacherId === teacherProfile.id;
    const isAdmin = (user?.roles ?? []).some((role) => ['DIRECTOR', 'PRECEPTOR'].includes(role)) || user?.isSuperAdmin === true;

    if (!userIsOwner && !isAdmin) {
        throw httpError(403, 'No tenés permisos para acceder a esta actividad');
    }

    return activity;
};

export const createQuizActivityService = async (user, payload = {}) => {
    const prisma = getPrisma();

    if (!payload || typeof payload !== 'object') {
        throw httpError(400, 'El payload del cuestionario es inválido');
    }

    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    if (!title) {
        throw httpError(400, 'El título del cuestionario es obligatorio');
    }

    const activityType = typeof payload.activityType === 'string' ? payload.activityType.trim() : 'TRIVIA';
    const teacherProfile = await ensureTeacherProfile(prisma, user, payload.teacherId);
    const teacherSubject = await ensureTeacherSubject(prisma, payload.teacherSubjectId, teacherProfile);
    const questions = normalizeQuestions(payload.questions);

    const activity = await prisma.activity.create({
        data: {
            title,
            description: `Cuestionario manual: ${title}`,
            gameType: activityType.toUpperCase(),
            pointsAwarded: payload.pointsAwarded ?? 100,
            status: 'ACTIVE',
            teacherId: teacherProfile.id,
            teacherSubjectId: teacherSubject?.id ?? null,
            content: {
                type: 'QUIZ',
                questions,
            },
        },
    });

    return {
        success: true,
        message: 'Cuestionario creado correctamente',
        activityId: activity.id,
        activity,
    };
};

export const getQuizActivityService = async (user, activityId) => {
    const prisma = getPrisma();
    const activity = await getActivityWithAccess(prisma, user, activityId);

    return {
        id: activity.id,
        title: activity.title,
        gameType: activity.gameType,
        description: activity.description,
        teacherId: activity.teacherId,
        teacherSubjectId: activity.teacherSubjectId,
        content: activity.content,
    };
};

export const updateQuizActivityService = async (user, activityId, payload = {}) => {
    const prisma = getPrisma();
    const existing = await getActivityWithAccess(prisma, user, activityId);

    if (!payload || typeof payload !== 'object') {
        throw httpError(400, 'El payload del cuestionario es inválido');
    }

    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    if (!title) {
        throw httpError(400, 'El título del cuestionario es obligatorio');
    }

    const activityType = typeof payload.activityType === 'string' ? payload.activityType.trim() : existing.gameType || 'TRIVIA';
    const questions = normalizeQuestions(payload.questions);

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { id: existing.teacherId },
    });

    const teacherSubject = payload.teacherSubjectId === undefined || payload.teacherSubjectId === null || payload.teacherSubjectId === ''
        ? null
        : await ensureTeacherSubject(prisma, payload.teacherSubjectId, teacherProfile);

    const updated = await prisma.activity.update({
        where: { id: existing.id },
        data: {
            title,
            description: `Cuestionario manual: ${title}`,
            gameType: activityType.toUpperCase(),
            teacherSubjectId: teacherSubject?.id ?? null,
            content: {
                type: 'QUIZ',
                questions,
            },
        },
    });

    return {
        success: true,
        message: 'Cuestionario actualizado correctamente',
        activityId: updated.id,
        activity: updated,
    };
};
