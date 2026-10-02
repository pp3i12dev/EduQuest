import { getPrisma } from '../config/prisma.js';

export const listSubjects = (institutionId) => {
    const prisma = getPrisma();
    return prisma.subject.findMany({
        where: { institutionId },
        include: {
            teachers: {
                include: {
                    teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                    course: true,
                    activities: true,
                },
            },
        },
        orderBy: { nombre: 'asc' },
    });
};

export const createSubject = ({ nombre, institutionId, teacherId, courseId, moduleTitle, gameType }) => {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
        const teacher = await tx.teacherProfile.findFirst({
            where: { id: teacherId, user: { institutionId } },
            select: { id: true },
        });
        const course = await tx.course.findFirst({
            where: { id: courseId, institutionId },
            select: { id: true },
        });

        if (!teacher || !course) return null;

        const subject = await tx.subject.create({
            data: {
                nombre,
                institutionId,
            },
            select: { id: true },
        });

        const assignment = await tx.teacherSubject.create({
            data: { teacherId, subjectId: subject.id, courseId },
            select: { id: true },
        });

        await tx.activity.create({
            data: {
                title: moduleTitle,
                gameType,
                content: {},
                teacherId,
                teacherSubjectId: assignment.id,
            },
        });

        return tx.subject.findUnique({
            where: { id: subject.id },
            include: {
                teachers: {
                    include: {
                        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                        course: true,
                        activities: true,
                    },
                },
            },
        });
    });
};

export const updateSubject = (id, institutionId, data) => {
    const prisma = getPrisma();
    return prisma.subject.update({ where: { id, institutionId }, data });
};

export const deleteSubject = (id, institutionId) => {
    const prisma = getPrisma();
    return prisma.subject.delete({ where: { id, institutionId } });
};