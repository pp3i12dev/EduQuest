import { getPrisma } from '../config/prisma.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const idOf = v => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) throw fail(400, 'Identificador inválido.');
  return n;
};
const includeAttempt = {
  student: { include: { user: { select: { firstName: true, lastName: true } } } },
  activity: { include: {
    teacherSubject: { include: { course: true, subject: true } },
    topic: { include: { unit: true } },
  } },
};
async function teacher(requester) {
  const p = await getPrisma().teacherProfile.findUnique({ where: { userId: requester.id } });
  if (!p) throw fail(403, 'Esta operación requiere un perfil de docente.');
  return p;
}
async function assignmentFor(requester, rawId) {
  const t = await teacher(requester);
  const a = await getPrisma().teacherSubject.findFirst({
    where: { id: idOf(rawId), teacherId: t.id, course: { institutionId: requester.institutionId } },
    include: { subject: true, course: true },
  });
  if (!a) throw fail(403, 'No sos el docente responsable de esa materia y curso.');
  return a;
}
function shape(a, showReview = false) {
  const course = a.activity?.teacherSubject?.course;
  const subject = a.activity?.teacherSubject?.subject;
  return {
    id: a.id, studentId: a.studentId,
    studentName: [a.student?.user?.firstName, a.student?.user?.lastName].filter(Boolean).join(' '),
    content: a.activityNameSnapshot || a.activity?.title || 'Actividad anterior',
    courseName: a.courseNameSnapshot || course?.nombre || 'Curso anterior',
    subjectName: a.subjectNameSnapshot || subject?.nombre || 'Materia anterior',
    unitName: a.unitNameSnapshot || a.activity?.topic?.unit?.title || 'Sin unidad',
    topicName: a.topicNameSnapshot || a.activity?.topic?.title || 'Sin tema',
    score: a.score, grade: Number((a.score / 10).toFixed(1)),
    earnedPoints: a.earnedPoints, dateTime: a.createdAt,
    durationSeconds: a.timeInSec, archived: Boolean(a.teacherArchivedAt),
    reviewAvailable: Array.isArray(a.answerReview),
    ...(showReview ? { review: Array.isArray(a.answerReview) ? a.answerReview : null } : {}),
  };
}
export async function assignments(requester) {
  const t = await teacher(requester);
  const rows = await getPrisma().teacherSubject.findMany({
    where: { teacherId: t.id, course: { institutionId: requester.institutionId } },
    include: { course: { select: { nombre: true, academicYear: true, id: true } },
      subject: { select: { nombre: true } } },
    orderBy: { id: 'desc' },
  });
  return rows.map(a => ({ id: a.id, courseId: a.course.id, courseName: a.course.nombre,
    academicYear: a.course.academicYear, subjectName: a.subject.nombre, isActive: a.isActive }));
}
export async function list(requester, rawAssignmentId, query = {}) {
  const assignment = await assignmentFor(requester, rawAssignmentId);
  const studentId = query.studentId ? idOf(query.studentId) : undefined;
  const activityId = query.activityId ? idOf(query.activityId) : undefined;
  const includeArchived = query.includeArchived === 'true';
  const rows = await getPrisma().gameAttempt.findMany({
    where: {
      isCompleted: true, ...(studentId ? { studentId } : {}),
      ...(activityId ? { activityId } : {}),
      ...(includeArchived ? {} : { teacherArchivedAt: null }),
      OR: [{ teacherSubjectIdSnapshot: assignment.id },
        { teacherSubjectIdSnapshot: null, activity: { teacherSubjectId: assignment.id } }],
    },
    include: includeAttempt, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 500,
  });
  return { assignment: { id: assignment.id, course: assignment.course.nombre,
    subject: assignment.subject.nombre }, records: rows.map(r => shape(r)) };
}
async function ownAttempt(requester, rawId) {
  const attempt = await getPrisma().gameAttempt.findUnique({
    where: { id: idOf(rawId) }, include: includeAttempt,
  });
  if (!attempt) throw fail(404, 'El intento no existe.');
  const assignmentId = attempt.teacherSubjectIdSnapshot || attempt.activity?.teacherSubjectId;
  if (!assignmentId) throw fail(403, 'El intento no está vinculado a una materia docente.');
  await assignmentFor(requester, assignmentId);
  return attempt;
}
export async function detail(requester, id) { return shape(await ownAttempt(requester, id), true); }
export async function setArchived(requester, id, archived) {
  if (typeof archived !== 'boolean') throw fail(400, 'archived debe ser booleano.');
  const a = await ownAttempt(requester, id);
  const updated = await getPrisma().gameAttempt.update({
    where: { id: a.id }, data: { teacherArchivedAt: archived ? new Date() : null },
    include: includeAttempt,
  });
  return shape(updated);
}
export async function removePermanently(requester, id, body = {}) {
  if (body.confirm !== 'BORRAR') throw fail(400, 'Para borrar definitivamente escribí BORRAR.');
  const a = await ownAttempt(requester, id);
  // Datos anteriores a la entrega 4 nunca guardaron puntos reales por intento.
  if (a.earnedPoints == null) throw fail(409, 'El intento es anterior al registro de puntos por partida. Se puede archivar, pero no borrar automáticamente sin una conciliación manual.');
  const prisma = getPrisma();
  return prisma.$transaction(async tx => {
    const fresh = await tx.gameAttempt.findUnique({ where: { id: a.id }, select: { id: true, studentId: true, earnedPoints: true } });
    if (!fresh) throw fail(404, 'El resultado ya fue eliminado.');
    if (fresh.earnedPoints == null) throw fail(409, 'No se conocen los puntos reales de este resultado.');
    const student = await tx.studentProfile.findUnique({ where: { id: fresh.studentId }, select: { puntosTotales: true } });
    if (!student || student.puntosTotales < fresh.earnedPoints) throw fail(409, 'Saldo inconsistente. No se puede descontar la recompensa sin conciliación.');
    // Borra un intento y descuenta únicamente los puntos realmente otorgados por él.
    await tx.gameAttempt.delete({ where: { id: fresh.id } });
    const points = student.puntosTotales - fresh.earnedPoints;
    await tx.studentProfile.update({ where: { id: fresh.studentId },
      data: { puntosTotales: points, nivelActual: Math.floor(points / 500) + 1 } });
    return { deleted: true, attemptId: fresh.id, pointsReversed: fresh.earnedPoints };
  }, { isolationLevel: 'Serializable' });
}
