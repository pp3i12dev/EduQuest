import { getPrisma } from '../config/prisma.js';

export const findStudentProfileByUserId = (userId) => {
    const prisma = getPrisma();

    return prisma.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
};

export const findActivityById = (activityId) => {
    const prisma = getPrisma();

    return prisma.activity.findUnique({
        where: { id: activityId },
        select: {
            id: true,
            title: true,
            gameType: true,
            status: true,
            content: true,
        },
    });
};

export const createGameAttempt = ({ activityId, studentId, score, timeInSec, isCompleted }) => {
    const prisma = getPrisma();

    return prisma.gameAttempt.create({
        data: { activityId, studentId, score, timeInSec, isCompleted },
    });
};
