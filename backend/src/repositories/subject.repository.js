import { getPrisma } from '../config/prisma.js';

export const listSubjects = (institutionId) => {
    const prisma = getPrisma();
    return prisma.subject.findMany({ where: { institutionId }, orderBy: { nombre: 'asc' } });
};

export const createSubject = (data) => {
    const prisma = getPrisma();
    return prisma.subject.create({ data });
};

export const updateSubject = (id, institutionId, data) => {
    const prisma = getPrisma();
    return prisma.subject.update({ where: { id, institutionId }, data });
};

export const deleteSubject = (id, institutionId) => {
    const prisma = getPrisma();
    return prisma.subject.delete({ where: { id, institutionId } });
};