import { getPrisma } from '../config/prisma.js';
import { rankStudents } from '../utils/leaderboardRanking.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const positive = raw => {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1) throw fail(400, 'Identificador inválido.');
  return n;
};
const studentPublicName = u => `${u?.firstName || 'Alumno'} ${u?.lastName?.trim()?.charAt(0) || ''}.`.trim();

async function build(courseId, { activityId = null, assignmentId = null, selfId = null, teacherView = false } = {}) {
  const prisma = getPrisma();
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true, nombre: true, institutionId: true, academicYear: true,
      students: { select: { studentId: true, student: { select: { user: {
        select: { firstName: true, lastName: true, isActive: true },
      } } } } },
    },
  });
  if (!course) throw fail(404, 'Curso no encontrado.');
  const allActivities = await prisma.activity.findMany({
    where: { status: 'ACTIVE', teacherSubject: {
      courseId, isActive: true, subject: { isActive: true },
    } },
    select: { id: true, title: true, teacherSubjectId: true },
    orderBy: [{ title: 'asc' }, { id: 'asc' }],
  });
  const chosenId = activityId == null || activityId === '' ? null : positive(activityId);
  if (chosenId != null && !allActivities.some(a => a.id === chosenId &&
      (assignmentId == null || a.teacherSubjectId === assignmentId))) {
    throw fail(403, 'La actividad no corresponde a tu curso o materia autorizados.');
  }
  const students = course.students.filter(s => s.student.user?.isActive).map(s => ({
    id: s.studentId,
    name: teacherView
      ? [s.student.user.firstName, s.student.user.lastName].filter(Boolean).join(' ')
      : studentPublicName(s.student.user),
  }));
  const attempts = students.length && allActivities.length ? await prisma.gameAttempt.groupBy({
    by: ['studentId', 'activityId'],
    where: { isCompleted: true, studentId: { in: students.map(s => s.id) },
      activityId: { in: allActivities.map(a => a.id) } },
    _max: { score: true },
  }) : [];
  const ranking = rankStudents({
    students, activities: allActivities, activityId: chosenId,
    attempts: attempts.map(a => ({ studentId: a.studentId, activityId: a.activityId, score: a._max.score })),
  });
  return {
    courseId: course.id, courseName: course.nombre, academicYear: course.academicYear,
    mode: chosenId == null ? 'GENERAL' : 'ACTIVITY', activityId: chosenId,
    activityName: allActivities.find(a => a.id === chosenId)?.title || null,
    // El docente solo puede seleccionar actividades de su propia asignación.
    activities: allActivities.filter(a => !teacherView || a.teacherSubjectId === assignmentId)
      .map(a => ({ id: a.id, title: a.title })),
    totalActivities: allActivities.length,
    policy: 'Mejor nota por actividad. Promedio sobre todas las actividades activas del curso (no realizadas: 0). Empates comparten posición. No se cuentan intentos eliminados.',
    myPosition: ranking.find(r => r.studentId === selfId)?.position ?? null,
    rows: ranking.map(r => ({ ...r, isMe: selfId != null && r.studentId === selfId,
      // Nunca exponer identificadores internos de otros menores al alumno.
      studentId: teacherView || r.studentId === selfId ? r.studentId : null,
    })),
  };
}

export async function forStudent(user, activityId = null) {
  const prisma = getPrisma();
  const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id },
    select: { id: true, courses: { select: { course: {
      select: { id: true, institutionId: true, academicYear: true },
    } } } } });
  if ((profile?.courses?.length || 0) > 1)
    throw fail(409, 'Las matrículas del alumno deben ser revisadas por la institución.');
  const course = profile?.courses?.[0]?.course;
  const currentYear = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric',
  }).format(new Date()));
  if (!course || course.institutionId !== user.institutionId || course.academicYear !== currentYear)
    throw fail(403, 'No tenés una matrícula institucional vigente en el año académico actual.');
  return build(course.id, { activityId, selfId: profile.id });
}

export async function forTeacher(user, assignmentId, activityId = null) {
  const prisma = getPrisma();
  const t = await prisma.teacherProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!t) throw fail(403, 'Se requiere un perfil docente.');
  const assignment = await prisma.teacherSubject.findFirst({
    where: { id: positive(assignmentId), teacherId: t.id,
      course: { institutionId: user.institutionId } },
    select: { id: true, courseId: true },
  });
  if (!assignment) throw fail(403, 'Esta asignación no te pertenece.');
  return build(assignment.courseId, { activityId, assignmentId: assignment.id, teacherView: true });
}
