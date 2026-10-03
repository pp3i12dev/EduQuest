import { getPrisma } from '../config/prisma.js';

export const findTeacherProfileByUserId = (userId) => {
    const prisma = getPrisma();
    return prisma.teacherProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
};

export const findTeacherSubjectsByTeacher = (teacherId) => {
    const prisma = getPrisma();
    return prisma.teacherSubject.findMany({
        where: { teacherId },
        include: { subject: true, course: true },
        orderBy: { subject: { nombre: 'asc' } },
    });
};

export const findTeacherSubjectWithDetails = (teacherSubjectId) => {
    const prisma = getPrisma();
    return prisma.teacherSubject.findUnique({
        where: { id: teacherSubjectId },
        include: {
            subject: true,
            course: true,
            contents: { orderBy: { createdAt: 'asc' } },
            activities: { orderBy: { createdAt: 'asc' } },
        },
    });
};

export const findAssignableActivities = (teacherId) => {
    const prisma = getPrisma();
    return prisma.activity.findMany({
        where: { teacherId, teacherSubjectId: null, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
    });
};

export const findActivitiesByIds = (activityIds) => {
    const prisma = getPrisma();
    return prisma.activity.findMany({
        where: { id: { in: activityIds } },
    });
};

export const findContentsByIds = (teacherSubjectId, contentIds) => {
    const prisma = getPrisma();
    return prisma.teacherSubjectContent.findMany({
        where: { teacherSubjectId, id: { in: contentIds } },
    });
};

export const applyChanges = (teacherSubjectId, changes) => {
    const prisma = getPrisma();
    const {
        contentsToCreate,
        contentsToRename,
        contentIdsToDelete,
        activityIdsToAdd,
        activityIdsToRemove,
    } = changes;

    return prisma.$transaction(async (tx) => {
        await tx.teacherSubjectContent.deleteMany({
            where: { teacherSubjectId, id: { in: contentIdsToDelete } },
        });

        for (const { id, name } of contentsToRename) {
            await tx.teacherSubjectContent.updateMany({
                where: { id, teacherSubjectId },
                data: { name },
            });
        }

        if (contentsToCreate.length > 0) {
            await tx.teacherSubjectContent.createMany({
                data: contentsToCreate.map((content) => ({ ...content, teacherSubjectId })),
            });
        }

        await tx.activity.updateMany({
            where: { id: { in: activityIdsToRemove }, teacherSubjectId },
            data: { teacherSubjectId: null },
        });

        await tx.activity.updateMany({
            where: { id: { in: activityIdsToAdd }, teacherSubjectId: null },
            data: { teacherSubjectId },
        });
    });
};