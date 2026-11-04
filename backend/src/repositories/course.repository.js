import { getPrisma } from '../config/prisma.js';

export const listCourses = (institutionId) => {
    const prisma = getPrisma();
    return prisma.course.findMany({
        where: institutionId == null ? {} : { institutionId },
        include: { career: true },
        orderBy: { nombre: 'asc' },
    });
};

export const createCourse = (data) => {
    const prisma = getPrisma();
    return prisma.course.create({ data, include: { career: true } });
};

export const updateCourse = (id, institutionId, data) => {
    const prisma = getPrisma();
    return prisma.course.update({ where: { id, ...(institutionId == null ? {} : { institutionId }) }, data, include: { career: true } });
};

export const deleteCourse = (id, institutionId) => {
    const prisma = getPrisma();
    return prisma.course.delete({ where: { id, ...(institutionId == null ? {} : { institutionId }) } });
};