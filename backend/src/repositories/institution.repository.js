import { getPrisma } from '../config/prisma.js';

export const findInstitutionById = (id) => {
    const prisma = getPrisma();

    return prisma.institution.findUnique({
        where: { id },
    });
};

export const updateInstitution = (id, data) => {
    const prisma = getPrisma();

    return prisma.institution.update({
        where: { id },
        data,
    });
};

export const listInstitutions = () => {
    const prisma = getPrisma();

    return prisma.institution.findMany({
        orderBy: {
            nombre: 'asc',
        },
    });
};

export const createInstitution = (data) => {
    const prisma = getPrisma();

    return prisma.institution.create({
        data,
    });
};

export const updateInstitutionAdmin = (id, data) => {
    const prisma = getPrisma();

    return prisma.institution.update({
        where: { id },
        data,
    });
};

export const setInstitutionActive = (id, isActive) => {
    const prisma = getPrisma();

    return prisma.institution.update({
        where: { id },
        data: { isActive },
    });
};

export const deleteInstitution = (id) => {
    const prisma = getPrisma();

    return prisma.institution.delete({
        where: { id },
    });
};