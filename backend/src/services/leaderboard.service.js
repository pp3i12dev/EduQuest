import { getPrisma } from '../config/prisma.js';
import { rankStudents } from '../utils/leaderboardRanking.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const positive = raw => {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1) throw fail(400, 'Identificador inválido.');
  return n;
};
const parsePositiveOptional = raw => (raw == null || raw === '' ? null : positive(raw));
const studentPublicName = u => `${u?.firstName || 'Alumno'} ${u?.lastName?.trim()?.charAt(0) || ''}.`.trim();

async function build(courseId, {
  activityId = null,
  assignmentId = null,
  selfId = null,
  teacherView = false,
} = {}) {
  const prisma = getPrisma();
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      nombre: true,
      institutionId: true,
      academicYear: true,
      students: {
        select: {
          studentId: true,
          student: {
            select: {
              user: { select: { firstName: true, lastName: true, isActive: true } },
            },
          },
        },
      },
    },
  });
  if (!course) throw fail(404, 'Curso no encontrado.');

  const subjectAssignments = await prisma.teacherSubject.findMany({
    // La vista docente ya verificó la titularidad de la asignación solicitada.
    // Una materia archivada mantiene acceso a su historial sin responder 403.
    // No exponemos materias de otros docentes en el selector docente.
    where: teacherView
      ? { courseId, id: parsePositiveOptional(assignmentId) }
      : { courseId, isActive: true, subject: { isActive: true } },
    select: { id: true, subject: { select: { nombre: true } } },
    orderBy: [{ id: 'asc' }],
  });
  const subjectOptions = subjectAssignments.map(item => ({ assignmentId: item.id, name: item.subject?.nombre || `Materia ${item.id}` }));

  const chosenAssignmentId = teacherView
    ? parsePositiveOptional(assignmentId)
    : (parsePositiveOptional(assignmentId) ?? subjectOptions[0]?.assignmentId ?? null);

  if (chosenAssignmentId != null && !subjectOptions.some(item => item.assignmentId === chosenAssignmentId)) {
    throw fail(403, 'La materia seleccionada no corresponde a tu curso.');
  }

  const allActivities = await prisma.activity.findMany({
    where: {
      status: 'ACTIVE',
      gameType: { not: 'image_label' },
      teacherSubject: {
        courseId,
        isActive: true,
        subject: { isActive: true },
        ...(chosenAssignmentId != null ? { id: chosenAssignmentId } : {}),
      },
    },
    select: { id: true, title: true, teacherSubjectId: true, pointsAwarded: true },
    orderBy: [{ title: 'asc' }, { id: 'asc' }],
  });

  const chosenActivityId = parsePositiveOptional(activityId);
  if (chosenActivityId != null && !allActivities.some(a => a.id === chosenActivityId)) {
    throw fail(403, 'La actividad no corresponde a tu curso o materia autorizados.');
  }

  const students = course.students.filter(s => s.student.user?.isActive).map(s => ({
    id: s.studentId,
    name: teacherView
      ? [s.student.user.firstName, s.student.user.lastName].filter(Boolean).join(' ')
      : studentPublicName(s.student.user),
  }));

  const attempts = students.length && allActivities.length ? await prisma.gameAttempt.findMany({
    where: {
      isCompleted: true,
      studentId: { in: students.map(s => s.id) },
      activityId: { in: allActivities.map(a => a.id) },
    },
    select: { studentId: true, activityId: true, score: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  }) : [];

  // Para datos históricos con múltiples intentos tomamos exclusivamente el
  // primero registrado; para datos nuevos solo se persiste el primero.
  const firstByStudentAndActivity = new Map();
  for (const attempt of attempts) {
    const key = `${attempt.studentId}:${attempt.activityId}`;
    if (!firstByStudentAndActivity.has(key)) firstByStudentAndActivity.set(key, attempt);
  }
  const ranking = rankStudents({
    students,
    activities: allActivities,
    activityId: chosenActivityId,
    attempts: [...firstByStudentAndActivity.values()],
  });

  return {
    courseId: course.id,
    courseName: course.nombre,
    academicYear: course.academicYear,
    assignmentId: chosenAssignmentId,
    subjectName: subjectOptions.find(s => s.assignmentId === chosenAssignmentId)?.name || null,
    subjects: subjectOptions,
    mode: chosenActivityId == null ? 'GENERAL' : 'ACTIVITY',
    activityId: chosenActivityId,
    activityName: allActivities.find(a => a.id === chosenActivityId)?.title || null,
    activities: allActivities.map(a => ({ id: a.id, title: a.title })),
    totalActivities: allActivities.length,
    policy: chosenActivityId == null
      ? 'Primer resultado competitivo por actividad. Promedio sobre las actividades activas de esta materia (pendientes: 0). Repetir es práctica sin puntos ni cambios de posición.'
      : 'Primer resultado competitivo en esta actividad. Las prácticas no modifican los puntos ni la posición.',
    myPosition: ranking.find(r => r.studentId === selfId)?.position ?? null,
    rows: ranking.map(r => ({
      ...r,
      isMe: selfId != null && r.studentId === selfId,
      studentId: teacherView || r.studentId === selfId ? r.studentId : null,
    })),
  };
}

export async function forStudent(user, assignmentId = null, activityId = null) {
  const prisma = getPrisma();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, courses: { select: { course: { select: { id: true, institutionId: true, academicYear: true } } } } },
  });
  if ((profile?.courses?.length || 0) > 1)
    throw fail(409, 'Las matrículas del alumno deben ser revisadas por la institución.');
  const course = profile?.courses?.[0]?.course;
  const currentYear = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric',
  }).format(new Date()));
  if (!course || course.institutionId !== user.institutionId || course.academicYear !== currentYear)
    throw fail(403, 'No tenés una matrícula institucional vigente en el año académico actual.');
  return build(course.id, { assignmentId, activityId, selfId: profile.id });
}

export async function forTeacher(user, assignmentId, activityId = null) {
  const prisma = getPrisma();
  const t = await prisma.teacherProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!t) throw fail(403, 'Se requiere un perfil docente.');
  const assignment = await prisma.teacherSubject.findFirst({
    where: { id: positive(assignmentId), teacherId: t.id, course: { institutionId: user.institutionId } },
    select: { id: true, courseId: true },
  });
  if (!assignment) throw fail(403, 'Esta asignación no te pertenece.');
  return build(assignment.courseId, { activityId, assignmentId: assignment.id, teacherView: true });
}
