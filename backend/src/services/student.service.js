import * as repo from '../repositories/student.repository.js';

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
  // La matrícula no posee fecha de baja: se toman las materias del año actual.
  const currentYear = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric' }).format(new Date()));
  const currentCourses = student.courses.filter(c => c.course.academicYear === currentYear);
  const assignments = await repo.findAssignments(currentCourses.map(c => c.courseId));
  return { student, currentCourses, assignments, byId: new Map(assignments.map(a => [a.id, a])) };
}
async function assignedActivity(requester, activityId) {
  const ctx = await context(requester);
  const activity = await repo.findPublishedActivity(numericId(activityId));
  if (!activity || activity.status !== 'ACTIVE' || !ctx.byId.has(activity.teacherSubjectId))
    throw fail(404, 'La actividad no está publicada para tu curso');
  return { ...ctx, activity };
}
function statements(activity) {
  if (activity.gameType !== 'true_false' || !Array.isArray(activity.content?.statements) || !activity.content.statements.length)
    throw fail(409, `El videojuego '${activity.gameType}' necesita implementación específica en Unity`);
  return activity.content.statements;
}
function publicQuestions(activity) {
  return {
    id: activity.id, title: activity.title, description: activity.description || '', gameType: activity.gameType,
    questions: statements(activity).map(q => ({ id: String(q.id), text: q.text })),
  };
}
function grade(keys, answers) {
  if (!Array.isArray(answers) || answers.length !== keys.size) throw fail(400, 'Respondé todas las preguntas');
  const seen = new Set(); let correct = 0;
  for (const item of answers) {
    const key = String(item?.id);
    if (seen.has(key) || !keys.has(key) || typeof item.answer !== 'boolean') throw fail(400, 'Respuestas inválidas o repetidas');
    seen.add(key);
    if (item.answer === keys.get(key)) correct++;
  }
  return { score: Math.round(correct * 100 / keys.size), correct, total: keys.size };
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
    pendingActivities: activities.filter(a => !done.has(a.id)).length,
    courses: currentCourses.map(c => ({ id: c.course.id, name: c.course.nombre, year: c.course.academicYear })),
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
  return list.map(a => {
    const matches = attempts.filter(t => t.activityId === a.id && t.isCompleted);
    return {
      id: a.id, title: a.title, description: a.description || '', gameType: a.gameType,
      subjectName: byId.get(id).subject.nombre, teacherName: teacherName(byId.get(id).teacher),
      completed: first.has(a.id), bestScore: matches.length ? Math.max(...matches.map(x => x.score)) : null,
      createdAt: a.createdAt, pointsAwarded: a.pointsAwarded,
    };
  });
}
export async function history(requester) {
  const { student } = await context(requester);
  const records = await repo.findAttempts(student.id);
  const seen = new Set();
  const items = records.filter(a => a.isCompleted).map(a => {
    // Schema actual no guarda puntos obtenidos por partida. Para los registros históricos
    // esta es una ESTIMACIÓN basada en el valor ACTUAL de pointsAwarded.
    const first = !seen.has(a.activityId); seen.add(a.activityId);
    return {
      id: a.id, activityTitle: a.activity?.title || 'Actividad eliminada',
      subjectName: a.activity?.teacherSubject?.subject?.nombre || 'Materia anterior',
      teacherName: teacherName(a.activity?.teacher),
      score: a.score, activityDate: a.activity?.createdAt ?? null, earnedPoints: first ? Math.round((a.activity?.pointsAwarded || 0) * a.score / 100) : 0,
      completedAt: a.createdAt, durationSeconds: a.timeInSec,
    };
  });
  return { totalPoints: student.puntosTotales, estimatedHistoricalPoints: true, items: items.reverse() };
}
export async function play(requester, activityId) {
  const { activity } = await assignedActivity(requester, activityId);
  return publicQuestions(activity); // correctAnswer NUNCA sale al cliente.
}
export async function complete(requester, activityId, body = {}) {
  const { student, activity } = await assignedActivity(requester, activityId);
  const keys = new Map(statements(activity).map(q => [String(q.id), q.correctAnswer]));
  const result = grade(keys, body.answers);
  const duration = Number(body.timeInSec);
  if (!Number.isFinite(duration) || duration < 0 || duration > 86400) throw fail(400, 'Duración inválida');
  const saved = await repo.saveGradedAttempt({
    studentId: student.id, activityId: activity.id, score: result.score,
    duration: Math.round(duration), pointsAwarded: activity.pointsAwarded,
  });
  return { ...result, ...saved, message: saved.earnedPoints ? '¡Ganaste puntos!' : 'Partida registrada. Esta actividad ya otorgó su recompensa.' };
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
  const keys = new Map();
  for (const answer of body.answers) {
    const key = String(answer?.id);
    if (!all.has(key) || keys.has(key)) throw fail(400, 'Pregunta inválida o repetida');
    keys.set(key, all.get(key));
  }
  return { ...grade(keys, body.answers), earnedPoints: 0, message: 'La práctica no modifica el historial, los puntos ni las notas.' };
}
