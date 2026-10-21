
import { getPrisma } from '../config/prisma.js';

export const findTeacherProfileByUserId = (userId) => {
    const prisma = getPrisma();

    return prisma.teacherProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
};

// Solo asignaciones docentes vigentes.
export const findTeacherSubjectsByTeacher = (teacherId) => {
    const prisma = getPrisma();

    return prisma.teacherSubject.findMany({
        where: {
            teacherId,
            isActive: true,
        },
        include: {
            subject: true,
            course: true,
            activities: true,
        },
        orderBy: {
            subject: { nombre: 'asc' },
        },
    });
};

// Listado operativo de asignaciones docentes.
// institutionId = null permite consultar todas las instituciones,
// exclusivamente cuando el servicio autoriza ese alcance.
export const findTeacherSubjectsByInstitution = (institutionId = null) => {
    const prisma = getPrisma();

    return prisma.teacherSubject.findMany({
        where: {
            isActive: true,
            ...(institutionId != null
                ? {
                    subject: {
                        institutionId,
                    },
                }
                : {}),
        },
        include: {
            subject: true,
            course: true,
            activities: true,
        },
        orderBy: {
            subject: { nombre: 'asc' },
        },
    });
};

// Permite consultar una asignación vigente o histórica.
// Los permisos de lectura y edición se controlan en el servicio.
export const findTeacherSubjectWithDetails = (teacherSubjectId) => {
    const prisma = getPrisma();

    return prisma.teacherSubject.findUnique({
        where: {
            id: teacherSubjectId,
        },
        include: {
            subject: true,
            course: true,
            contents: {
                orderBy: { createdAt: 'asc' },
            },
            activities: {
                orderBy: { createdAt: 'asc' },
            },
        },
    });
};

// Actividades disponibles para asignar a una materia.
export const findAssignableActivities = (teacherId) => {
    const prisma = getPrisma();

    return prisma.activity.findMany({
        where: {
            teacherId,
            teacherSubjectId: null,
            status: 'ACTIVE',
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const findActivitiesByIds = (activityIds) => {
    const prisma = getPrisma();

    return prisma.activity.findMany({
        where: {
            id: { in: activityIds },
        },
    });
};

export const findContentsByIds = (teacherSubjectId, contentIds) => {
    const prisma = getPrisma();

    return prisma.teacherSubjectContent.findMany({
        where: {
            teacherSubjectId,
            id: { in: contentIds },
        },
    });
};

// Modifica contenidos y actividades de una asignación vigente.
// Nunca elimina la asignación TeacherSubject ni su historial.
export const applyChanges = (teacherSubjectId, changes) => {
    const prisma = getPrisma();

    const {
        contentsToCreate,
        contentsToRename,
        contentIdsToDelete,
        activityIdsToAdd,
        activityIdsToRemove,
    } = changes;

    return prisma.$transaction(async (tx) => {
        // Comprobamos que la asignación siga vigente.
        const assignment = await tx.teacherSubject.findUnique({
            where: {
                id: teacherSubjectId,
            },
            select: {
                isActive: true,
            },
        });

        if (!assignment || !assignment.isActive) {
            const error = new Error(
                'Esta asignación docente ya no está vigente.'
            );

            error.status = 409;
            throw error;
        }

        // Eliminar contenidos seleccionados.
        await tx.teacherSubjectContent.deleteMany({
            where: {
                teacherSubjectId,
                id: {
                    in: contentIdsToDelete,
                },
            },
        });

        // Renombrar contenidos existentes.
        for (const { id, name } of contentsToRename) {
            await tx.teacherSubjectContent.updateMany({
                where: {
                    id,
                    teacherSubjectId,
                },
                data: {
                    name,
                },
            });
        }

        // Crear nuevos contenidos.
        if (contentsToCreate.length > 0) {
            await tx.teacherSubjectContent.createMany({
                data: contentsToCreate.map((content) => ({
                    ...content,
                    teacherSubjectId,
                })),
            });
        }

        // Desvincular actividades seleccionadas.
        await tx.activity.updateMany({
            where: {
                id: {
                    in: activityIdsToRemove,
                },
                teacherSubjectId,
            },
            data: {
                teacherSubjectId: null,
            },
        });

        // Vincular nuevas actividades disponibles.
        await tx.activity.updateMany({
            where: {
                id: {
                    in: activityIdsToAdd,
                },
                teacherSubjectId: null,
            },
            data: {
                teacherSubjectId,
            },
        });
    });
};
