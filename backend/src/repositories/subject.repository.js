import { getPrisma } from '../config/prisma.js';

export const listSubjects = (institutionId) => {
    const prisma = getPrisma();
    return prisma.subject.findMany({
        where: { institutionId },
        include: {
            teachers: {
                include: {
                    teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                    course: { include: { career: true } },
                },
            },
        },
        orderBy: { nombre: 'asc' },
    });
};

export const createSubject = ({ nombre, institutionId, teacherId, courseId, gameId }) => {
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

        return tx.subject.create({
            data: {
                nombre,
                institutionId,
                teachers: {
                    create: { teacherId, courseId, gameId },
                },
            },
            include: { teachers: true },
        });
    });
};

export const updateSubject = (id, institutionId, data) => {
    const prisma = getPrisma();
    return prisma.subject.update({ where: { id, institutionId }, data });
};

export const setSubjectStatus = (id, institutionId, isActive) => {
    const prisma = getPrisma();
    return prisma.subject.update({ where: { id, institutionId }, data: { isActive } });
};

export const deleteSubject = (id, institutionId) => {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
        await tx.teacherSubject.deleteMany({ where: { subjectId: id, subject: { institutionId } } });
        return tx.subject.delete({ where: { id, institutionId } });
    });
};