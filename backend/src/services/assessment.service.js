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
    id: a.id, studentId: a.studentId, activityId: a.activityId,
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
      subject: { select: { id: true, nombre: true } } },
    orderBy: { id: 'desc' },
  });
  return rows.map(a => ({ id: a.id, courseId: a.course.id, courseName: a.course.nombre,
    academicYear: a.course.academicYear, subjectId: a.subject.id,
    subjectName: a.subject.nombre, isActive: a.isActive }));
}

async function studentAccess(requester, rawUserId) {
  const prisma = getPrisma();
  const teacherProfile = await teacher(requester);
  const userId = idOf(rawUserId);
  const student = await prisma.studentProfile.findFirst({
    where: {
      userId,
      user: {
        institutionId: requester.institutionId,
        deletedAt: null,
        studentProfile: { isNot: null },
      },
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      courses: { include: { course: { select: { id: true, nombre: true } } } },
    },
  });
  if (!student) throw fail(404, 'No se encontró el alumno.');
  const courseIds = student.courses.map(item => item.courseId);
  const assignments = courseIds.length ? await prisma.teacherSubject.findMany({
    where: {
      teacherId: teacherProfile.id,
      courseId: { in: courseIds },
      isActive: true,
      course: { institutionId: requester.institutionId },
      subject: { isActive: true, deletedAt: null },
    },
    include: {
      subject: { select: { id: true, nombre: true } },
      course: { select: { id: true, nombre: true } },
    },
    orderBy: [{ course: { nombre: 'asc' } }, { subject: { nombre: 'asc' } }],
  }) : [];
  if (!assignments.length) throw fail(403, 'No tenés materias asignadas en los cursos de este alumno.');
  return { student, assignments };
}

function performanceAttempt(attempt) {
  const assignmentId = attempt.teacherSubjectIdSnapshot || attempt.activity?.teacherSubjectId || null;
  const assignment = attempt.activity?.teacherSubject;
  return {
    id: attempt.id,
    teacherSubjectId: assignmentId,
    subjectName: attempt.subjectNameSnapshot || assignment?.subject?.nombre || 'Materia anterior',
    activityTitle: attempt.activityNameSnapshot || attempt.activity?.title || 'Actividad anterior',
    score: attempt.score,
    durationSeconds: attempt.timeInSec,
    date: attempt.createdAt,
    isCompleted: Boolean(attempt.isCompleted),
  };
}

export async function studentPerformance(requester, rawUserId, query = {}) {
  const { student, assignments } = await studentAccess(requester, rawUserId);
  const prisma = getPrisma();
  const assignmentIds = assignments.map(item => item.id);
  const teacherSubjectId = query.teacherSubjectId ? idOf(query.teacherSubjectId) : null;
  if (teacherSubjectId && !assignmentIds.includes(teacherSubjectId)) {
    throw fail(403, 'No tenés acceso a esa materia del alumno.');
  }
  const [attempts, evaluations] = await Promise.all([
    prisma.gameAttempt.findMany({
      where: {
        studentId: student.id,
        OR: [
          { teacherSubjectIdSnapshot: { in: assignmentIds } },
          { teacherSubjectIdSnapshot: null, activity: { teacherSubjectId: { in: assignmentIds } } },
        ],
      },
      include: { activity: { include: { teacherSubject: { include: { subject: true } } } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
    prisma.manualEvaluation.findMany({
      where: { studentId: student.id, teacherSubjectId: { in: assignmentIds } },
      include: { teacherSubject: { include: { subject: true, course: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
  ]);
  const allAttempts = attempts.map(performanceAttempt);
  const status = query.status || '';
  if (status && !['COMPLETED', 'IN_PROGRESS'].includes(status)) {
    throw fail(400, 'El filtro de estado no es válido.');
  }
  const normalizedAttempts = allAttempts.filter(item =>
    (!teacherSubjectId || item.teacherSubjectId === teacherSubjectId) &&
    (!status || item.isCompleted === (status === 'COMPLETED')));
  const normalizedEvaluations = evaluations
    .filter(item => !teacherSubjectId || item.teacherSubjectId === teacherSubjectId);
  const completed = allAttempts.filter(item => item.isCompleted);
  const gradeValues = [
    ...completed.map(item => item.score / 10),
    ...evaluations.map(item => Number(item.grade)),
  ];
  return {
    student: {
      id: student.userId,
      name: [student.user.firstName, student.user.lastName].filter(Boolean).join(' '),
      courses: student.courses.map(item => item.course.nombre),
      level: student.nivelActual,
      points: student.puntosTotales,
    },
    subjects: assignments.map(item => ({
      id: item.id,
      name: item.subject.nombre,
      courseName: item.course.nombre,
    })),
    summary: {
      completed: completed.length,
      inProgress: allAttempts.length - completed.length,
      averageGrade: gradeValues.length
        ? Number((gradeValues.reduce((sum, value) => sum + value, 0) / gradeValues.length).toFixed(2))
        : null,
    },
    attempts: normalizedAttempts,
    evaluations: normalizedEvaluations.map(item => ({
      id: item.id,
      teacherSubjectId: item.teacherSubjectId,
      subjectName: item.teacherSubject.subject.nombre,
      courseName: item.teacherSubject.course.nombre,
      grade: Number(item.grade),
      observations: item.observations,
      date: item.createdAt,
    })),
    hasRecords: allAttempts.length > 0 || evaluations.length > 0,
  };
}

export async function createManualEvaluation(requester, rawUserId, body = {}) {
  const { student, assignments } = await studentAccess(requester, rawUserId);
  const teacherSubjectId = idOf(body.teacherSubjectId, 'Materia');
  if (!assignments.some(item => item.id === teacherSubjectId)) {
    throw fail(403, 'La materia no está asignada a este alumno.');
  }
  const grade = Number(body.grade);
  if (!Number.isFinite(grade) || grade < 0 || grade > 10) {
    throw fail(400, 'La calificación debe ser un número entre 0 y 10.');
  }
  const observations = body.observations == null ? '' : String(body.observations).trim();
  if (observations.length > 2000) throw fail(400, 'Las observaciones no pueden superar los 2000 caracteres.');
  const result = await getPrisma().manualEvaluation.create({
    data: {
      studentId: student.id,
      teacherSubjectId,
      grade: Math.round(grade * 100) / 100,
      observations: observations || null,
    },
    include: { teacherSubject: { include: { subject: true, course: true } } },
  });
  return {
    id: result.id,
    teacherSubjectId: result.teacherSubjectId,
    subjectName: result.teacherSubject.subject.nombre,
    courseName: result.teacherSubject.course.nombre,
    grade: Number(result.grade),
    observations: result.observations,
    date: result.createdAt,
  };
}
// Los filtros se obtienen de toda la materia, no únicamente de la página visible.
// También incluyen intentos de actividades antiguas (conservadas por su historial).
export async function filters(requester, rawAssignmentId, query = {}) {
  const assignment = await assignmentFor(requester, rawAssignmentId);
  const includeArchived = query.includeArchived === 'true';
  const where = {
    isCompleted: true,
    ...(includeArchived ? {} : { teacherArchivedAt: null }),
    OR: [
      { teacherSubjectIdSnapshot: assignment.id },
      { teacherSubjectIdSnapshot: null, activity: { teacherSubjectId: assignment.id } },
    ],
  };
  const prisma = getPrisma();
  const combinations = await prisma.gameAttempt.groupBy({
    by: ['activityId', 'studentId'], where, _count: { _all: true },
  });
  const activityIds = [...new Set(combinations.map(row => row.activityId))];
  const studentIds = [...new Set(combinations.map(row => row.studentId))];
  const [activities, studentProfiles] = await Promise.all([
    activityIds.length ? prisma.activity.findMany({
      where: { id: { in: activityIds } }, select: { id: true, title: true },
    }) : [],
    studentIds.length ? prisma.studentProfile.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    }) : [],
  ]);
  const titles = new Map(activities.map(a => [a.id, a.title]));
  const names = new Map(studentProfiles.map(s => [s.id,
    [s.user?.firstName, s.user?.lastName].filter(Boolean).join(' ') || `Alumno ${s.id}`]));
  const activityGroups = new Map();
  const studentGroups = new Map();
  for (const entry of combinations) {
    const activity = activityGroups.get(entry.activityId) || {
      id: entry.activityId, title: titles.get(entry.activityId) || `Actividad ${entry.activityId}`,
      results: 0, studentCount: 0,
    };
    activity.results += entry._count._all;
    activity.studentCount += 1;
    activityGroups.set(entry.activityId, activity);
    const student = studentGroups.get(entry.studentId) || {
      id: entry.studentId, name: names.get(entry.studentId) || `Alumno ${entry.studentId}`, results: 0,
    };
    student.results += entry._count._all;
    studentGroups.set(entry.studentId, student);
  }
  return {
    activities: [...activityGroups.values()].sort((a, b) => a.title.localeCompare(b.title, 'es')),
    students: [...studentGroups.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')),
  };
}

export async function list(requester, rawAssignmentId, query = {}) {
  const assignment = await assignmentFor(requester, rawAssignmentId);
  const studentId = query.studentId ? idOf(query.studentId) : undefined;
  const activityId = query.activityId ? idOf(query.activityId) : undefined;
  const includeArchived = query.includeArchived === 'true';
  const page = query.page ? idOf(query.page) : 1;
  const pageSize = query.pageSize ? idOf(query.pageSize) : 50;
  if (pageSize > 100) throw fail(400, 'Máximo 100 resultados por página.');
  if (page > 1000000) throw fail(400, 'Número de página fuera de rango.');
  const where = {
    isCompleted: true,
    ...(studentId ? { studentId } : {}),
    ...(activityId ? { activityId } : {}),
    ...(includeArchived ? {} : { teacherArchivedAt: null }),
    OR: [
      { teacherSubjectIdSnapshot: assignment.id },
      { teacherSubjectIdSnapshot: null, activity: { teacherSubjectId: assignment.id } },
    ],
  };
  const prisma = getPrisma();
  const total = await prisma.gameAttempt.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = await prisma.gameAttempt.findMany({
    where, include: includeAttempt,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (safePage - 1) * pageSize, take: pageSize,
  });
  return {
    assignment: { id: assignment.id, course: assignment.course.nombre,
      subject: assignment.subject.nombre },
    records: rows.map(r => shape(r)),
    pagination: { page: safePage, pageSize, total, totalPages },
  };
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
    const fresh = await tx.gameAttempt.findUnique({ where: { id: a.id },
      select: { id: true, studentId: true, activityId: true, earnedPoints: true } });
    if (!fresh) throw fail(404, 'El resultado ya fue eliminado.');
    const firstCompetitive = await tx.gameAttempt.findFirst({
      where: { studentId: fresh.studentId, activityId: fresh.activityId, isCompleted: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true },
    });
    if (firstCompetitive?.id === fresh.id)
      throw fail(409, 'El primer intento competitivo es una calificación académica protegida. Podés archivarlo, pero no borrarlo definitivamente.');
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
