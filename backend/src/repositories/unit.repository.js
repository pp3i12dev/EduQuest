import { getPrisma } from '../config/prisma.js';

// Solo cuenta los minijuegos que siguen asignados a esa materia
const unitInclude = (teacherSubjectId) => ({
    activities: {
        where: { activity: { teacherSubjectId } },
        include: { activity: { select: { id: true, title: true } } },
    },
});

export const findUnitsByTeacherSubject = (teacherSubjectId) => {
    const prisma = getPrisma();
    return prisma.unit.findMany({
        where: { teacherSubjectId },
        include: unitInclude(teacherSubjectId),
        orderBy: { createdAt: 'asc' },
    });
};

// El create anidado es atómico: o se guarda todo o nada
export const createUnitWithActivities = ({ teacherSubjectId, title, description, activityIds }) => {
    const prisma = getPrisma();
    return prisma.unit.create({
        data: {
            title,
            description,
            teacherSubjectId,
            activities: { create: activityIds.map((activityId) => ({ activityId })) },
        },
        include: unitInclude(teacherSubjectId),
    });
};