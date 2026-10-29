import { getPrisma } from '../config/prisma.js';

export const createActivity = (data) => {
    const prisma = getPrisma();
    return prisma.activity.create({ data });
};

export const updateActivity = (id, data) => {
    const prisma = getPrisma();
    return prisma.activity.update({ where: { id }, data });
};

export const findActivityById = (id) => {
    const prisma = getPrisma();
    return prisma.activity.findUnique({ where: { id } });
};

export const findActivitiesByTeacher = (teacherId) => {
    const prisma = getPrisma();
    return prisma.activity.findMany({
        where: { teacherId },
        orderBy: { createdAt: 'desc' },
    });
};