import { getPrisma } from '../config/prisma.js';

export const listCareers = (institutionId) => {
    const prisma = getPrisma();
    return prisma.career.findMany({ where: { institutionId }, orderBy: { nombre: 'asc' } });
};

export const createCareer = (data) => {
    const prisma = getPrisma();
    return prisma.career.create({ data });
};

export const updateCareer = (id, institutionId, data) => {
    const prisma = getPrisma();
    return prisma.career.update({ where: { id, institutionId }, data });
};

export const deleteCareer = (id, institutionId) => {
    const prisma = getPrisma();
    return prisma.career.delete({ where: { id, institutionId } });
};