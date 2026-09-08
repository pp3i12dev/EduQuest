import { getPrisma } from '../config/prisma.js';

export const findInstitutionById = (id) => {
    const prisma = getPrisma();
    return prisma.institution.findUnique({ where: { id } });
};

export const updateInstitution = (id, data) => {
    const prisma = getPrisma();
    return prisma.institution.update({ where: { id }, data });
};