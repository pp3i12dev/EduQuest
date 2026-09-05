import { getPrisma } from '../config/prisma.js';

export const getDashboardSummary = async (req, res) => {
    try {
        const prisma = getPrisma();
        const { institutionId } = req.user;

        const [students, teachers, preceptors, directors, invitations] = await Promise.all([
            prisma.studentProfile.count({ where: { user: { institutionId } } }),
            prisma.teacherProfile.count({ where: { user: { institutionId } } }),
            prisma.preceptorProfile.count({ where: { user: { institutionId } } }),
            prisma.directorProfile.count({ where: { user: { institutionId } } }),
            prisma.invitation.count({
                where: { isUsed: false, director: { institutionId } },
            }),
        ]);

        return res.status(200).json({ students, teachers, preceptors, directors, invitations });
    } catch (error) {
        console.error('❌ Error en dashboard summary:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
};