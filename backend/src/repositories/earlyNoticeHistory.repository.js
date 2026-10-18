import { getPrisma } from '../config/prisma.js';

const prisma = getPrisma();

export const earlyNoticeHistoryRepository = {
    findUser(id) {
        return prisma.user.findUnique({
            where: { id: Number(id) },
            include: {
                directorProfile: true,
                preceptorProfile: true,
                teacherProfile: true,
                studentProfile: true,
            },
        });
    },

    isStudentEnrolled(courseId, userId) {
        return prisma.studentCourse.findFirst({
            where: { courseId, student: { userId } },
            select: { id: true },
        });
    },

    findClasses(earlyNoticeId) {
        return prisma.earlyNoticeClass.findMany({
            where: { earlyNoticeId },
            orderBy: [{ classDate: 'asc' }, { startTime: 'asc' }],
            select: {
                id: true,
                teacherSubjectId: true,
                scheduleId: true,
                classDate: true,
                day: true,
                shift: true,
                startTime: true,
                endTime: true,
            },
        });
    },

    findRevisions(earlyNoticeId) {
        return prisma.earlyNoticeRevision.findMany({
            where: { earlyNoticeId },
            orderBy: [{ version: 'desc' }],
            select: {
                id: true,
                version: true,
                action: true,
                createdAt: true,
                createdById: true,
            },
        });
    },
};
