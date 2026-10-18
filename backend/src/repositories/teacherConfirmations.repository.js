import { getPrisma } from '../config/prisma.js';

const prisma = getPrisma();

export const teacherConfirmationsRepository = {
    findUser(id) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true, isActive: true, institutionId: true,
                teacherProfile: { select: { id: true } },
            },
        });
    },
    findPending(teacherUserId, institutionId) {
        return prisma.earlyNotice.findMany({
            where: {
                teacherUserId,
                institutionId,
                status: 'PENDING',
                isActive: true,
                deletedAt: null,
            },
            select: {
                id: true, type: true, status: true, reason: true,
                periodStart: true, periodEnd: true, classDate: true,
                createdAt: true, createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                affectedClasses: {
                    orderBy: [{ classDate: 'asc' }, { startTime: 'asc' }],
                    select: {
                        id: true, classDate: true, startTime: true, endTime: true,
                        shift: true,
                        teacherSubject: {
                            select: {
                                subject: { select: { id: true, nombre: true } },
                                course: { select: { id: true, nombre: true } },
                            },
                        },
                    },
                },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
    },
};
