import { getPrisma } from '../config/prisma.js';

// Toda la consulta de Prisma queda concentrada en este repositorio.
export const findStudent = userId => getPrisma().studentProfile.findUnique({
  where: { userId },
  include: { courses: { include: { course: true } } },
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
  },
});

export const findPublishedActivity = id => getPrisma().activity.findUnique({
  where: { id },
  select: {
    id: true, title: true, description: true, gameType: true, content: true,
    pointsAwarded: true, status: true, createdAt: true, teacherSubjectId: true,
  },
});

export const findAttempts = studentId => getPrisma().gameAttempt.findMany({
  where: { studentId },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  include: {
    activity: {
      select: {
        title: true, pointsAwarded: true, createdAt: true,
        teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
        teacherSubject: { select: { subject: { select: { nombre: true } }, course: { select: { nombre: true } } } },
      },
    },
  },
});

// Serializable + reintentos evitan duplicar recompensas ante dos entregas simultáneas.
export const saveGradedAttempt = async ({ studentId, activityId, score, duration, pointsAwarded }) => {
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
          data: { studentId, activityId, score, isCompleted: true, timeInSec: duration },
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
