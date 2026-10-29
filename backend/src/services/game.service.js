import {
    findStudentProfileByUserId,
    findActivityById,
    createGameAttempt,
} from '../repositories/game.repository.js';

// Reglas de la HU Verdadero/Falso
const QUESTIONS_PER_GAME = 10;
const POINTS_PER_HIT = 10;
const DEFAULT_PASSING_PERCENTAGE = 60; // si el docente no define content.passingPercentage

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const shuffle = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const getPlayableTrueFalseActivity = async (activityId) => {
    const activity = await findActivityById(activityId);

    if (!activity || activity.gameType !== 'true_false') {
        throw httpError(404, 'Actividad Verdadero/Falso no encontrada');
    }
    if (activity.status !== 'ACTIVE') {
        throw httpError(409, 'La actividad no está publicada');
    }

    // Formato que guarda el modal del docente (rama crear-editar_VF):
    // content = { statements: [{ id, text, correctAnswer, order }] }
    const statements = activity.content?.statements ?? [];
    if (statements.length === 0) {
        throw httpError(409, 'La actividad no tiene afirmaciones cargadas');
    }

    return { activity, statements };
};

const getStudentProfile = async (user) => {
    const student = await findStudentProfileByUserId(user.id);
    if (!student) throw httpError(403, 'Solo los alumnos pueden jugar');
    return student;
};

// GET: 10 afirmaciones aleatorias de las que creó el docente
export const getTrueFalseGame = async (user, activityId) => {
    await getStudentProfile(user);
    const { activity, statements } = await getPlayableTrueFalseActivity(activityId);

    const selected = shuffle(statements)
        .slice(0, QUESTIONS_PER_GAME)
        .map(({ id, text, correctAnswer }) => ({ id: String(id), text, correctAnswer }));

    return {
        activityId: activity.id,
        title: activity.title,
        totalQuestions: selected.length,
        statements: selected,
    };
};

// POST: el backend vuelve a corregir (no confía en el cliente) y guarda el intento
export const submitTrueFalseResults = async (user, activityId, body) => {
    const { alumnoId, timeInSec, respuestasAlumno } = body ?? {};

    if (alumnoId !== undefined && Number(alumnoId) !== user.id) {
        throw httpError(403, 'El alumno no coincide con la sesión');
    }
    if (!Array.isArray(respuestasAlumno) || respuestasAlumno.length === 0) {
        throw httpError(400, 'respuestasAlumno debe ser un arreglo con al menos una respuesta');
    }

    const student = await getStudentProfile(user);
    const { activity, statements } = await getPlayableTrueFalseActivity(activityId);

    const correctById = new Map(statements.map((s) => [String(s.id), s.correctAnswer === true]));
    const seen = new Set();
    let hits = 0;

    for (const r of respuestasAlumno) {
        const id = String(r?.statementId);
        if (!correctById.has(id)) throw httpError(400, `Afirmación inexistente: ${id}`);
        if (seen.has(id)) throw httpError(400, `Afirmación repetida: ${id}`);
        if (typeof r.respuesta !== 'boolean') throw httpError(400, 'Cada respuesta debe ser true o false');
        seen.add(id);
        if (r.respuesta === correctById.get(id)) hits++;
    }

    // Si perdió las 3 vidas antes de terminar, las no respondidas cuentan como 0
    const total = Math.min(QUESTIONS_PER_GAME, statements.length);
    const score = hits * POINTS_PER_HIT;
    const maxScore = total * POINTS_PER_HIT;
    const percentage = Math.round((hits / total) * 1000) / 10;
    // "Criterio del profesor": opcional en content.passingPercentage (sin migración, es Json)
    const passingPercentage = Number(activity.content?.passingPercentage) || DEFAULT_PASSING_PERCENTAGE;

    const attempt = await createGameAttempt({
        activityId,
        studentId: student.id,
        score,
        timeInSec: Math.max(0, Math.round(Number(timeInSec) || 0)),
        isCompleted: respuestasAlumno.length >= total,
    });

    return {
        attemptId: attempt.id,
        score,
        maxScore,
        hits,
        total,
        percentage,
        passed: percentage >= passingPercentage,
    };
};
