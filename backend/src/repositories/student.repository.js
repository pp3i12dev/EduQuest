import { getPrisma } from '../config/prisma.js';

// Toda la consulta de Prisma queda concentrada en este repositorio.
export const findStudent = userId => getPrisma().studentProfile.findUnique({
  where: { userId },
  include: {
    user: { select: { institutionId: true, firstName: true, lastName: true } },
    courses: { include: { course: true } },
  },
});

export const findAssignments = courseIds => getPrisma().teacherSubject.findMany({
  where: { courseId: { in: courseIds }, isActive: true, subject: { isActive: true } },
  include: {
    subject: { select: { id: true, nombre: true } },
    course: { select: { id: true, nombre: true, academicYear: true } },
    teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
  },
});

export const findPublishedActivities = assignmentIds => getPrisma().activity.findMany({
  where: { teacherSubjectId: { in: assignmentIds }, status: 'ACTIVE' },
  orderBy: { createdAt: 'desc' },
  select: {
    id: true, title: true, description: true, gameType: true, content: true,
    pointsAwarded: true, status: true, createdAt: true, teacherSubjectId: true,
    topic: { select: { title: true, unit: { select: { title: true } } } },
  },
});

export const findPublishedActivity = id => getPrisma().activity.findUnique({
  where: { id },
  select: {
    id: true, title: true, description: true, gameType: true, content: true,
    pointsAwarded: true, status: true, createdAt: true, teacherSubjectId: true,
    topic: { select: { title: true, unit: { select: { title: true } } } },
  },
});

export const findAttempts = studentId => getPrisma().gameAttempt.findMany({
  where: { studentId },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  include: {
    activity: {
      select: {
        title: true, pointsAwarded: true, createdAt: true, topicId: true,
        topic: { select: { title: true, unit: { select: { title: true } } } },
        teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
        teacherSubject: { select: { subject: { select: { nombre: true } }, course: { select: { nombre: true } } } },
      },
    },
  },
});

// Serializable + reintentos evitan duplicar recompensas ante dos entregas simultáneas.
export const saveGradedAttempt = async ({ studentId, activityId, score, duration, pointsAwarded, review, snapshot }) => {
  const prisma = getPrisma();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        const previous = await tx.gameAttempt.findFirst({
          where: { studentId, activityId, isCompleted: true },
          select: { id: true },
        });
        const earnedPoints = previous ? 0 : Math.max(0, Math.round(pointsAwarded * score / 100));
        const record = await tx.gameAttempt.create({
          data: { studentId, activityId, score, isCompleted: true, timeInSec: duration,
            answerReview: review, earnedPoints,
            subjectNameSnapshot: snapshot.subjectName, courseNameSnapshot: snapshot.courseName,
            unitNameSnapshot: snapshot.unitName, topicNameSnapshot: snapshot.topicName,
            activityNameSnapshot: snapshot.activityName, teacherSubjectIdSnapshot: snapshot.assignmentId },
          select: { id: true },
        });
        let profile;
        if (earnedPoints > 0) {
          profile = await tx.studentProfile.update({
            where: { id: studentId },
            data: { puntosTotales: { increment: earnedPoints } },
            select: { puntosTotales: true, nivelActual: true, monedas: true },
          });
          // REGLA MVP: un nivel cada 500 puntos; coins no se alteran sin política definida.
          const newLevel = Math.floor(profile.puntosTotales / 500) + 1;
          if (newLevel !== profile.nivelActual) {
            profile = await tx.studentProfile.update({
              where: { id: studentId }, data: { nivelActual: newLevel },
              select: { puntosTotales: true, nivelActual: true, monedas: true },
            });
          }
        } else {
          profile = await tx.studentProfile.findUnique({
            where: { id: studentId }, select: { puntosTotales: true, nivelActual: true, monedas: true },
          });
        }
        return { attemptId: record.id, earnedPoints, points: profile.puntosTotales, level: profile.nivelActual, coins: profile.monedas };
      }, { isolationLevel: 'Serializable' });
    } catch (err) {
      if (err.code === 'P2034' && attempt < 2) continue;
      throw err;
    }
  }
};


export const findStudentContentTree = assignmentId => getPrisma().unit.findMany({
  where: { teacherSubjectId: assignmentId },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  select: {
    id: true, title: true, description: true,
    topics: {
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: {
        id: true, title: true, description: true,
        materials: { where: { isPublished: true }, orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, originalName: true, mimeType: true, sizeBytes: true } },
        activities: { where: { status: 'ACTIVE', teacherSubjectId: assignmentId },
          select: { id: true, title: true, gameType: true, pointsAwarded: true } },
      },
    },
  },
});

export const hideStudentAttempt = (id, studentId) => getPrisma().gameAttempt.updateMany({
  where: { id, studentId }, data: { studentHiddenAt: new Date() },
});
export const findStudentAttempt = (id, studentId) => getPrisma().gameAttempt.findFirst({
  where: { id, studentId }, include: {
    activity: { include: { topic: { include: { unit: true } },
      teacherSubject: { include: { subject: true, course: true } } } },
  },
});
