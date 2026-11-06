import * as repo from '../repositories/student.repository.js';
import { gradeQuestions, gradeLabel } from '../utils/assessmentGrading.js';
import { matchingQuestionBank, shuffledMatchingQuestions } from '../utils/matchingQuestions.js';
import { EXTRA_TYPES, extraQuestionBank, toPublicExtraQuestions } from '../utils/gameMechanics.js';
import { historyDeletionBlockReason, HISTORY_PROTECTED_LATEST, HISTORY_PROTECTED_DAYS } from '../utils/historyRetention.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const numericId = v => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw fail(400, 'Identificador inválido');
  return n;
};
const teacherName = profile => [profile?.user?.firstName, profile?.user?.lastName].filter(Boolean).join(' ') || 'Docente';

async function context(requester) {
  const student = await repo.findStudent(requester.id);
  if (!student) throw fail(403, 'Esta cuenta no tiene perfil de alumno');
  // Defensa adicional: el alumno no puede consultar materias si existen matrículas duplicadas
  // o de otra institución (por ejemplo, datos heredados anteriores a la migración).
  if (student.courses.length > 1 || student.courses.some(c => c.course.institutionId !== student.user.institutionId)) {
    throw fail(409, 'La matrícula del alumno requiere revisión administrativa: debe pertenecer a un solo curso de su institución.');
  }
  // La matrícula no posee fecha de baja: se toman las materias del año actual.
  const currentYear = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric' }).format(new Date()));
  const currentCourses = student.courses.filter(c => c.course.academicYear === currentYear);
  const assignments = await repo.findAssignments(currentCourses.map(c => c.courseId));
  return { student, currentCourses, assignments, byId: new Map(assignments.map(a => [a.id, a])) };
}
async function assignedActivity(requester, activityId) {
  const ctx = await context(requester);
  const activity = await repo.findPublishedActivity(numericId(activityId));
  if (!activity || activity.status !== 'ACTIVE' || activity.gameType === 'image_label' || !ctx.byId.has(activity.teacherSubjectId))
    throw fail(404, 'La actividad no está publicada para tu curso');
  return { ...ctx, activity };
}
function questionsFor(activity) {
  if (activity.gameType === 'true_false') {
    if (!Array.isArray(activity.content?.statements) || !activity.content.statements.length) throw fail(409, 'Actividad sin afirmaciones');
    return activity.content.statements;
  }
  if (activity.gameType === 'multiple_choice') {
    if (!Array.isArray(activity.content?.questions) || !activity.content.questions.length) throw fail(409, 'Actividad sin preguntas de opciones múltiples');
    return activity.content.questions;
  }
  if (activity.gameType === 'matching') return matchingQuestionBank(activity);
  if (EXTRA_TYPES.includes(activity.gameType)) return extraQuestionBank(activity);
  throw fail(409, `El videojuego '${activity.gameType}' todavía no tiene adaptador evaluativo en Unity`);
}
function statements(activity) { return questionsFor(activity); }
function publicQuestions(activity) {
  return {
    id: activity.id, title: activity.title, description: activity.description || '', gameType: activity.gameType,
    questions: activity.gameType === 'matching'
      ? shuffledMatchingQuestions(questionsFor(activity))
      : EXTRA_TYPES.includes(activity.gameType) ? toPublicExtraQuestions(questionsFor(activity))
      : questionsFor(activity).map(q => ({ id: String(q.id), text: q.text,
        ...(activity.gameType === 'multiple_choice' ? { options: q.options.map(o => ({ id: String(o.id), text: o.text })) } : {}) })),
  };
}
function firstCompleted(attempts) {
  const first = new Map();
  for (const a of attempts) if (a.isCompleted && !first.has(a.activityId)) first.set(a.activityId, a);
  return first;
}

export async function dashboard(requester) {
  const { student, currentCourses, byId } = await context(requester);
  const [activities, attempts] = await Promise.all([
    repo.findPublishedActivities([...byId.keys()]), repo.findAttempts(student.id),
  ]);
  const done = firstCompleted(attempts);
  return {
    points: student.puntosTotales, level: student.nivelActual, coins: student.monedas,
    finishedGames: attempts.filter(a => a.isCompleted).length,
    pendingActivities: activities.filter(a => a.gameType !== 'image_label' && !done.has(a.id)).length,
    courses: currentCourses.map(c => ({ id: c.course.id, name: c.course.nombre, year: c.course.academicYear, shift: c.course.shift })),
    progressRule: 'Primera finalización: porcentaje correcto × pointsAwarded; 500 puntos por nivel; repetir no da puntos',
  };
}
export async function subjects(requester) {
  const { assignments } = await context(requester);
  return assignments.map(a => ({
    id: a.id, subjectId: a.subjectId, name: a.subject.nombre,
    teacherName: teacherName(a.teacher), courseId: a.courseId, courseName: a.course.nombre,
  })).sort((a, b) => a.name.localeCompare(b.name));
}
export async function activities(requester, assignmentId) {
  const { student, byId } = await context(requester);
  const id = numericId(assignmentId);
  if (!byId.has(id)) throw fail(404, 'Materia no asignada a tu curso actual');
  const [list, attempts] = await Promise.all([repo.findPublishedActivities([id]), repo.findAttempts(student.id)]);
  const first = firstCompleted(attempts);
  return list.filter(a => a.gameType !== 'image_label').map(a => {
    const competitive = first.get(a.id);
    return {
      id: a.id, title: a.title, description: a.description || '', gameType: a.gameType,
      subjectName: byId.get(id).subject.nombre, teacherName: teacherName(byId.get(id).teacher),
      completed: first.has(a.id), bestScore: competitive ? competitive.score : null,
      createdAt: a.createdAt, pointsAwarded: a.pointsAwarded,
    };
  });
}
function toAttemptRow(a, name = '') {
  const assignment = a.activity?.teacherSubject;
  const score = a.score;
  return {
    id: a.id, studentName: name,
    activityTitle: a.activityNameSnapshot || a.activity?.title || 'Actividad anterior',
    subjectName: a.subjectNameSnapshot || assignment?.subject?.nombre || 'Materia anterior',
    courseName: a.courseNameSnapshot || assignment?.course?.nombre || 'Curso anterior',
    unitName: a.unitNameSnapshot || a.activity?.topic?.unit?.title || 'Sin unidad registrada',
    topicName: a.topicNameSnapshot || a.activity?.topic?.title || 'Sin tema registrado',
    score, grade: gradeLabel(score), gradeLabel: `${gradeLabel(score).toFixed(1)}/10`,
    earnedPoints: a.earnedPoints, durationSeconds: a.timeInSec,
    completedAt: a.createdAt, reviewAvailable: Array.isArray(a.answerReview),
    teacherArchived: Boolean(a.teacherArchivedAt),
    studentHidden: Boolean(a.studentHiddenAt),
  };
}
export async function history(requester, query = {}) {
  const { student } = await context(requester);
  const records = (await repo.findAttempts(student.id)).filter(a => a.isCompleted);
  // Los 5 últimos se calculan sobre TODOS los intentos, incluso los ocultos.
  const latestProtected = new Set(records.slice(-HISTORY_PROTECTED_LATEST).map(a => a.id));
  // La partida competitiva original no debe poder borrarse para obtener
  // una segunda oportunidad en el ranking. Las prácticas antiguas sí.
  const firstCompetitiveByActivity = new Map();
  for (const attempt of records)
    if (!firstCompetitiveByActivity.has(attempt.activityId))
      firstCompetitiveByActivity.set(attempt.activityId, attempt.id);
  const includeHidden = query.includeHidden === 'true';
  const studentName = [student.user.firstName, student.user.lastName].filter(Boolean).join(' ');
  const items = records.filter(a => includeHidden || !a.studentHiddenAt).reverse().map(a => {
    const protectedCompetitive = firstCompetitiveByActivity.get(a.activityId) === a.id;
    const reason = protectedCompetitive
      ? 'La primera partida competitiva debe conservarse para evitar alterar la clasificación. Podés ocultarla de tu historial cuando corresponda.'
      : historyDeletionBlockReason(a, latestProtected);
    return {
      ...toAttemptRow(a, studentName),
      canHide: !a.studentHiddenAt && !latestProtected.has(a.id) &&
        Date.now() - new Date(a.createdAt).getTime() >= HISTORY_PROTECTED_DAYS * 86400000,
      canDelete: reason === null,
      deleteBlockedReason: reason,
    };
  });
  return {
    totalPoints: student.puntosTotales,
    estimatedHistoricalPoints: records.some(a => a.earnedPoints == null),
    retentionPolicy: `Se conservan los últimos ${HISTORY_PROTECTED_LATEST} intentos y todos los de los últimos ${HISTORY_PROTECTED_DAYS} días. Borrar es irreversible: también elimina la nota del docente y descuenta los puntos ganados en ese intento.`,
    items,
  };
}
// Compatibilidad: clientes antiguos usan DELETE /history/:id para OCULTAR, nunca para borrar.
export async function hideHistoryItem(requester, rawAttemptId) {
  const { student } = await context(requester);
  const records = (await repo.findAttempts(student.id)).filter(a => a.isCompleted);
  const id = numericId(rawAttemptId);
  const item = records.find(a => a.id === id);
  if (!item) throw fail(404, 'Resultado no encontrado.');
  if (records.slice(-HISTORY_PROTECTED_LATEST).some(a => a.id === id) ||
      Date.now() - new Date(item.createdAt).getTime() < HISTORY_PROTECTED_DAYS * 86400000)
    throw fail(409, 'Se conservan visibles los últimos 5 resultados y los de los últimos 7 días.');
  await repo.hideStudentAttempt(id, student.id);
  return { message: 'Resultado oculto de tu historial. La calificación académica permanece registrada.' };
}
export async function deleteHistoryPermanently(requester, rawAttemptId, body = {}) {
  if (body.confirm !== 'BORRAR') throw fail(400, 'Confirmación requerida: BORRAR.');
  const { student } = await context(requester);
  return repo.deleteStudentAttemptPermanently(numericId(rawAttemptId), student.id);
}
export async function historyDetail(requester, rawAttemptId) {
  const { student } = await context(requester);
  const item = await repo.findStudentAttempt(numericId(rawAttemptId), student.id);
  if (!item) throw fail(404, 'Resultado no disponible.');
  return { ...toAttemptRow(item, [student.user.firstName, student.user.lastName].filter(Boolean).join(' ')), review: Array.isArray(item.answerReview) ? item.answerReview : null };
}
export async function play(requester, activityId) {
  const { activity } = await assignedActivity(requester, activityId);
  return publicQuestions(activity); // correctAnswer NUNCA sale al cliente.
}
export async function complete(requester, activityId, body = {}) {
  const { student, activity, byId } = await assignedActivity(requester, activityId);
  const byAssignment = byId.get(activity.teacherSubjectId);
  const result = gradeQuestions(statements(activity), body.answers, activity.gameType);
  const duration = Number(body.timeInSec);
  if (!Number.isFinite(duration) || duration < 0 || duration > 86400) throw fail(400, 'Duración inválida');
  if (body.practice === true) {
    // La práctica SOLO está disponible después de una finalización real;
    // no permite consultar respuestas y luego competir con ventaja.
    const previous = await repo.hasCompletedActivity(student.id, activity.id);
    if (!previous) throw fail(409, 'La primera partida debe ser evaluativa. La práctica se habilita al completarla.');
    const profile = await repo.getStudentProgress(student.id);
    return { ...result, grade: gradeLabel(result.score), earnedPoints: 0, attemptId: null,
      points: profile.puntosTotales, level: profile.nivelActual, coins: profile.monedas,
      practiceOnly: true,
      message: 'Práctica finalizada: no modifica los puntos, la nota ni las clasificaciones.' };
  }
  const saved = await repo.saveGradedAttempt({
    studentId: student.id, activityId: activity.id, score: result.score,
    duration: Math.round(duration), pointsAwarded: activity.pointsAwarded, review: result.review,
    snapshot: {
      assignmentId: activity.teacherSubjectId,
      subjectName: byAssignment.subject.nombre, courseName: byAssignment.course.nombre,
      unitName: activity.topic?.unit?.title || null, topicName: activity.topic?.title || null,
      activityName: activity.title,
    },
  });
  return { ...result, grade: gradeLabel(result.score), ...saved,
    message: saved.practiceOnly
      ? 'Esta actividad ya tenía una partida competitiva. El reintento se evaluó como práctica y no cambió el ranking.'
      : (saved.earnedPoints ? '¡Ganaste puntos!' : 'Partida competitiva registrada (sin puntos por respuestas incorrectas).') };
}
async function publishedTrueFalse(requester) {
  const { byId } = await context(requester);
  const all = await repo.findPublishedActivities([...byId.keys()]);
  return all.filter(a => a.gameType === 'true_false' && Array.isArray(a.content?.statements) && a.content.statements.length);
}
export async function practiceGames(requester) {
  const available = await publishedTrueFalse(requester);
  return available.length ? [{ gameType: 'true_false', name: 'Verdadero o falso', activities: available.length }] : [];
}
export async function practiceQuestions(requester, gameType) {
  if (gameType !== 'true_false') throw fail(400, 'Tipo de juego desconocido');
  const available = await publishedTrueFalse(requester);
  const questions = available.flatMap(a => statements(a).map(q => ({ id: `${a.id}:${q.id}`, text: q.text })));
  // 24 preguntas como máximo para que la interfaz sea cómoda y rápida.
  return { gameType, title: 'Entrenamiento libre', questions: questions.slice(0, 24) };
}
export async function practiceCheck(requester, body = {}) {
  if (body.gameType !== 'true_false') throw fail(400, 'Tipo de juego desconocido');
  const available = await publishedTrueFalse(requester);
  const all = new Map(available.flatMap(a => statements(a).map(q => [`${a.id}:${q.id}`, q.correctAnswer])));
  if (!Array.isArray(body.answers) || !body.answers.length || body.answers.length > 24) throw fail(400, 'Cantidad inválida de respuestas');
  const allText = new Map(available.flatMap(a => statements(a).map(q => [`${a.id}:${q.id}`, q.text])));
  const keys = new Map();
  for (const answer of body.answers) {
    const key = String(answer?.id);
    if (!all.has(key) || keys.has(key)) throw fail(400, 'Pregunta inválida o repetida');
    keys.set(key, all.get(key));
  }
  const qList = [...keys.entries()].map(([id, correctAnswer]) => ({ id, text: allText.get(id) || '', correctAnswer }));
  const result = gradeQuestions(qList, body.answers);
  return { ...result, grade: gradeLabel(result.score), earnedPoints: 0, message: 'La práctica no modifica el historial, los puntos ni las notas.' };
}


// Jerarquía académica: curso actual -> materia -> unidad -> tema -> contenidos publicados.
// No se devuelven claves de almacenamiento ni respuestas correctas.
export async function contentTree(requester, assignmentId) {
  const { byId } = await context(requester);
  const id = numericId(assignmentId);
  if (!byId.has(id)) throw fail(404, 'Esta materia no pertenece a tu curso vigente.');
  const units = await repo.findStudentContentTree(id);
  return {
    teacherSubjectId: id,
    courseId: byId.get(id).courseId,
    subjectName: byId.get(id).subject.nombre,
    units: units.map(unit => ({
      id: unit.id, title: unit.title, description: unit.description,
      topics: unit.topics.map(topic => ({
        id: topic.id, title: topic.title, description: topic.description,
        materials: topic.materials.map(material => ({
          id: material.id, title: material.title, filename: material.originalName,
          mimeType: material.mimeType, sizeBytes: material.sizeBytes,
          downloadPath: `/api/student/materials/${material.id}/file`,
        })),
        activities: topic.activities.filter(a => a.gameType !== 'image_label').map(a => ({ id: a.id, title: a.title, gameType: a.gameType, pointsAwarded: a.pointsAwarded, difficulty: a.content?.difficulty ?? 5 })),
      })),
    })),
  };
}
