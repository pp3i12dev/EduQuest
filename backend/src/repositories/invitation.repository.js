import { getPrisma } from '../config/prisma.js';

export const findInvitationsByInviter = (invitedById) => {
    const prisma = getPrisma();
    return prisma.invitation.findMany({
        where: { invitedById },
        include: { course: true },
        omit: { token: true },
        orderBy: { createdAt: 'desc' },
    });
};

export const findInvitationsByInstitution = (institutionId) => {
    const prisma = getPrisma();
    return prisma.invitation.findMany({
        where: { invitedBy: { institutionId } },
        include: { course: true },
        omit: { token: true },
        orderBy: { createdAt: 'desc' },
    });
};

export const createInvitation = (data) => {
    const prisma = getPrisma();
    return prisma.invitation.create({ data, include: { course: true } });
};

export const findInvitationById = (id) => {
    const prisma = getPrisma();
    return prisma.invitation.findUnique({ where: { id } });
};

export const findInvitationByToken = (token) => {
    const prisma = getPrisma();
    return prisma.invitation.findUnique({ where: { token } });
};

export const deleteInvitation = (id) => {
    const prisma = getPrisma();
    return prisma.invitation.delete({ where: { id } });
};

export const findUserById = (id) => {
    const prisma = getPrisma();
    return prisma.user.findUnique({ where: { id } });
};

export const createUserFromInvitation = ({ invitationId, userCreateData }) => {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: userCreateData });
        await tx.invitation.update({ where: { id: invitationId }, data: { isUsed: true } });
        return user;
    });
};