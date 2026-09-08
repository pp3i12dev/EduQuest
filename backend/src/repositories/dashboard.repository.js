import { getPrisma } from '../config/prisma.js';

export const countProfilesByInstitution = async (institutionId) => {
    const prisma = getPrisma();
    const [students, teachers, preceptors, directors, invitations] = await Promise.all([
        prisma.studentProfile.count({ where: { user: { institutionId } } }),
        prisma.teacherProfile.count({ where: { user: { institutionId } } }),
        prisma.preceptorProfile.count({ where: { user: { institutionId } } }),
        prisma.directorProfile.count({ where: { user: { institutionId } } }),
        prisma.invitation.count({ where: { isUsed: false, invitedBy: { institutionId } } }),
    ]);
    return { students, teachers, preceptors, directors, invitations };
};