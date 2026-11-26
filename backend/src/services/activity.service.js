import { getPrisma } from '../config/prisma.js';

const GAME_TYPE = 'true_false';
const QUIZ_TYPE = 'multiple_choice';

const httpError = (status, message) => Object.assign(new Error(message), { status });
const idOf = (value, label = 'Identificador') => {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) throw httpError(400, `${label} inválido`);
    return id;
};

async function teacherProfile(user) {
    const teacher = await getPrisma().teacherProfile.findUnique({ where: { userId: user.id } });
    if (!teacher) throw httpError(403, 'El usuario no es profesor');
    return teacher;
}

async function ownActivity(user, rawId) {
    const activityId = idOf(rawId, 'Id de actividad');
    const activity = await getPrisma().activity.findUnique({ where: { id: activityId } });
    if (!activity) throw httpError(404, 'La actividad no existe');
    const teacher = await teacherProfile(user);
    if (activity.teacherId !== teacher.id) throw httpError(403, 'No tenés permiso para esta actividad');
    return activity;
}

function cleanStatements(content) {
    const statements = content?.statements;
    if (!Array.isArray(statements) || !statements.length) {
        throw httpError(400, 'La actividad debe tener al menos una afirmación');
    }
    return statements.map((statement, index) => {
        const text = typeof statement?.text === 'string' ? statement.text.trim() : '';
        if (!text) throw httpError(400, `La afirmación ${index + 1} no puede estar vacía`);
        if (typeof statement.correctAnswer !== 'boolean') {
            throw httpError(400, `La afirmación ${index + 1} debe ser Verdadero o Falso`);
        }
        return { id: index + 1, text, correctAnswer: statement.correctAnswer };
    });
}

function cleanQuestions(rawQuestions) {
    if (!Array.isArray(rawQuestions) || !rawQuestions.length) {
        throw httpError(400, 'Debés enviar al menos una pregunta');
    }
    return rawQuestions.map((question, questionIndex) => {
        const text = typeof question?.text === 'string' ? question.text.trim() : '';
        if (!text) throw httpError(400, `La pregunta ${questionIndex + 1} no puede estar vacía`);
        if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 4) {
            throw httpError(400, `La pregunta ${questionIndex + 1} debe tener entre 2 y 4 opciones`);
        }
        const options = question.options.map((option, optionIndex) => {
            const optionText = typeof option?.text === 'string' ? option.text.trim() : '';
            if (!optionText) throw httpError(400, `La opción ${optionIndex + 1} no puede estar vacía`);
            return { id: optionIndex + 1, text: optionText, isCorrect: option.isCorrect === true };
        });
        const correctOptions = question.options
            .map((option, index) => option?.isCorrect === true ? String(index + 1) : null)
            .filter(Boolean);
        if (correctOptions.length !== 1) {
            throw httpError(400, `La pregunta ${questionIndex + 1} debe tener exactamente una respuesta correcta`);
        }
        return { id: questionIndex + 1, text, options, correctAnswer: correctOptions[0] };
    });
}

function quizData(body = {}) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw httpError(400, 'El título del cuestionario es obligatorio');
    if (title.length > 120) throw httpError(400, 'El título no puede superar los 120 caracteres');
    return {
        title,
        description: `Cuestionario manual: ${title}`,
        gameType: QUIZ_TYPE,
        pointsAwarded: 100,
        content: { type: 'QUIZ', questions: cleanQuestions(body.questions) },
    };
}

function trueFalseData(body = {}) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw httpError(400, 'El título es obligatorio');
    if (title.length > 120) throw httpError(400, 'El título no puede superar los 120 caracteres');
    return {
        title,
        description: typeof body.description === 'string' ? body.description.trim() || null : null,
        gameType: GAME_TYPE,
        content: { statements: cleanStatements(body.content) },
        status: 'DRAFT',
    };
}

function isQuiz(body, existing) {
    const activityType = typeof body?.activityType === 'string' ? body.activityType.toUpperCase() : '';
    const gameType = typeof body?.gameType === 'string' ? body.gameType.toUpperCase() : '';
    const existingType = typeof existing?.gameType === 'string' ? existing.gameType.toUpperCase() : '';
    return activityType === 'TRIVIA' || activityType === 'MULTIPLE_CHOICE' ||
        gameType === 'TRIVIA' || gameType === 'MULTIPLE_CHOICE' ||
        existingType === 'TRIVIA' || existingType === 'MULTIPLE_CHOICE';
}

async function validateTeacherSubject(user, teacher, rawId) {
    const id = idOf(rawId, 'Materia asignada');
    const assignment = await getPrisma().teacherSubject.findFirst({
        where: { id, teacherId: teacher.id, course: { institutionId: user.institutionId } },
        include: { course: true, subject: true },
    });
    if (!assignment) throw httpError(403, 'No sos responsable de esa materia y curso');
    return assignment;
}

export async function listMyActivities(user) {
    const teacher = await teacherProfile(user);
    return getPrisma().activity.findMany({
        where: { teacherId: teacher.id },
        include: { ActivityCourse: { select: { courseId: true } } },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getMyActivity(user, activityId) {
    const activity = await ownActivity(user, activityId);
    return getPrisma().activity.findUnique({
        where: { id: activity.id },
        include: { ActivityCourse: { select: { courseId: true } } },
    });
}

export async function createDraft(user, body = {}) {
    const teacher = await teacherProfile(user);
    const data = isQuiz(body) ? quizData(body) : trueFalseData(body);
    const rawAssignmentId = body.teacherSubjectId;
    const assignment = rawAssignmentId ? await validateTeacherSubject(user, teacher, rawAssignmentId) : null;
    return getPrisma().activity.create({
        data: {
            ...data,
            teacherId: teacher.id,
            teacherSubjectId: assignment?.id ?? null,
            status: 'DRAFT',
            isPublished: false,
        },
    });
}

export async function updateDraft(user, activityId, body = {}) {
    const activity = await ownActivity(user, activityId);
    if (activity.status !== 'DRAFT') throw httpError(409, 'Solo se pueden editar actividades en borrador');
    const teacher = await teacherProfile(user);
    const data = isQuiz(body, activity) ? quizData(body) : trueFalseData(body);
    const rawAssignmentId = body.teacherSubjectId;
    const assignment = rawAssignmentId ? await validateTeacherSubject(user, teacher, rawAssignmentId) : null;
    return getPrisma().activity.update({
        where: { id: activity.id },
        data: { ...data, teacherSubjectId: assignment?.id ?? activity.teacherSubjectId },
    });
}

export async function setActivityStatus(user, activityId, status, rawAssignmentIds = []) {
    const activity = await ownActivity(user, activityId);
    if (!['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'DRAFT'].includes(status)) {
        throw httpError(400, 'Estado de actividad inválido');
    }
    if (status !== 'ACTIVE') {
        return getPrisma().activity.update({
            where: { id: activity.id },
            data: { status, isPublished: false, publishedAt: null },
        });
    }

    const teacher = await teacherProfile(user);
    const assignmentIds = Array.isArray(rawAssignmentIds)
        ? [...new Set(rawAssignmentIds.map(value => idOf(value, 'Materia asignada')))]
        : [];
    if (!assignmentIds.length) throw httpError(400, 'Seleccioná al menos un curso para publicar');
    const assignments = await getPrisma().teacherSubject.findMany({
        where: {
            id: { in: assignmentIds },
            teacherId: teacher.id,
            course: { institutionId: user.institutionId },
        },
        include: { course: true, subject: true },
    });
    if (assignments.length !== assignmentIds.length) {
        throw httpError(403, 'Una o más materias no están asignadas a tu usuario');
    }

    if (['TRIVIA', QUIZ_TYPE.toUpperCase()].includes(activity.gameType.toUpperCase())) {
        cleanQuestions(activity.content?.questions);
    }
    else if (activity.gameType === GAME_TYPE) cleanStatements(activity.content);
    else if (!activity.content) throw httpError(400, 'La actividad no tiene contenido para publicar');

    const anchor = assignments.find(item => item.id === activity.teacherSubjectId) || assignments[0];
    if (assignments.some(item => item.subjectId !== anchor.subjectId)) {
        throw httpError(400, 'Una actividad solo puede asignarse a cursos de la misma materia');
    }

    return getPrisma().$transaction(async tx => {
        await tx.activityCourse.deleteMany({ where: { activityId: activity.id } });
        await tx.activityCourse.createMany({
            data: assignments.map(assignment => ({ activityId: activity.id, courseId: assignment.courseId })),
            skipDuplicates: true,
        });
        return tx.activity.update({
            where: { id: activity.id },
            data: {
                teacherSubjectId: anchor.id,
                status: 'ACTIVE',
                isPublished: true,
                publishedAt: new Date(),
            },
            include: { ActivityCourse: { select: { courseId: true } } },
        });
    });
}
