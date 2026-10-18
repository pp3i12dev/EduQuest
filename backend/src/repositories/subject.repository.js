
import { getPrisma } from '../config/prisma.js';

const subjectInclude = {
    institution: {
        select: {
            id: true,
            nombre: true,
        },
    },
    teachers: {
        include: {
            teacher: {
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            institutionId: true,
                        },
                    },
                },
            },
            course: {
                include: {
                    career: {
                        select: {
                            id: true,
                            nombre: true,
                            level: true,
                        },
                    },
                },
            },
            activities: true,
        },
        orderBy: [
            { isActive: 'desc' },
            { id: 'asc' },
        ],
    },
    schedules: {
        include: {
            course: {
                select: {
                    id: true,
                    nombre: true,
                    careerId: true,
                },
            },
        },
        orderBy: [
            { day: 'asc' },
            { startTime: 'asc' },
        ],
    },
};

const badRequest = message => {
    const error = new Error(message);
    error.status = 400;
    return error;
};

export const listSubjects = (institutionId = null) => {
    const prisma = getPrisma();

    return prisma.subject.findMany({
        where:
            institutionId == null
                ? {}
                : { institutionId },
        include: subjectInclude,
        orderBy: { nombre: 'asc' },
    });
};

export const findSubject = (id, institutionId = null) => {
    const prisma = getPrisma();

    return prisma.subject.findFirst({
        where: {
            id,
            ...(institutionId != null
                ? { institutionId }
                : {}),
        },
        include: subjectInclude,
    });
};

export const createSubject = ({
    nombre,
    institutionId,
    teacherId,
    courseId,
    schedules = [],
}) => {
    const prisma = getPrisma();

    return prisma.$transaction(async tx => {
        const [teacher, course] = await Promise.all([
            tx.teacherProfile.findFirst({
                where: {
                    id: teacherId,
                    user: {
                        institutionId,
                        isActive: true,
                    },
                },
                select: { id: true },
            }),
            tx.course.findFirst({
                where: {
                    id: courseId,
                    institutionId,
                },
                select: { id: true },
            }),
        ]);

        if (!teacher || !course) {
            return null;
        }

        const subject = await tx.subject.create({
            data: {
                nombre,
                institutionId,
            },
        });

        await tx.teacherSubject.create({
            data: {
                teacherId,
                subjectId: subject.id,
                courseId,
                isActive: true,
            },
        });

        if (schedules.length > 0) {
            await tx.subjectSchedule.createMany({
                data: schedules.map(schedule => ({
                    subjectId: subject.id,
                    courseId,
                    day: schedule.day,
                    shift: schedule.shift,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                })),
            });
        }

        return tx.subject.findUnique({
            where: { id: subject.id },
            include: subjectInclude,
        });
    });
};

export const updateSubject = (
    id,
    institutionId,
    {
        nombre,
        isActive,
        teacherId,
        courseId,
        schedules,
    }
) => {
    const prisma = getPrisma();

    return prisma.$transaction(async tx => {
        const subject = await tx.subject.findFirst({
            where: {
                id,
                ...(institutionId != null
                    ? { institutionId }
                    : {}),
            },
            include: {
                teachers: {
                    orderBy: { id: 'asc' },
                },
            },
        });

        if (!subject) {
            return null;
        }

        const updated = await tx.subject.update({
            where: { id },
            data: {
                ...(nombre !== undefined ? { nombre } : {}),
                ...(isActive !== undefined ? { isActive } : {}),
            },
        });

        const activeAssignments = subject.teachers.filter(
            assignment => assignment.isActive
        );

        const selectedCourseId =
            courseId ??
            (activeAssignments.length === 1
                ? activeAssignments[0].courseId
                : null);

        // Si solo se modifica el nombre o estado de la materia,
        // no se toca ninguna asignación docente.
        const shouldUpdateTeacher = teacherId != null;

        if (shouldUpdateTeacher) {
            if (selectedCourseId == null) {
                throw badRequest(
                    'Seleccioná el curso para cambiar el docente.'
                );
            }

            const [teacher, course] = await Promise.all([
                tx.teacherProfile.findFirst({
                    where: {
                        id: teacherId,
                        user: {
                            institutionId: subject.institutionId,
                            isActive: true,
                        },
                    },
                    select: { id: true },
                }),
                tx.course.findFirst({
                    where: {
                        id: selectedCourseId,
                        institutionId: subject.institutionId,
                    },
                    select: { id: true },
                }),
            ]);

            if (!teacher || !course) {
                throw badRequest(
                    'El docente o el curso no pertenece a la institución.'
                );
            }

            // Se desactivan las asignaciones anteriores
            // únicamente de esta materia y este curso.
            // No se borran actividades, contenidos ni avisos.
            await tx.teacherSubject.updateMany({
                where: {
                    subjectId: id,
                    courseId: selectedCourseId,
                    isActive: true,
                    teacherId: { not: teacherId },
                },
                data: {
                    isActive: false,
                },
            });

            // Si el docente ya había estado asignado, recuperamos
            // su registro histórico. Si es nuevo, lo creamos.
            await tx.teacherSubject.upsert({
                where: {
                    teacherId_subjectId_courseId: {
                        teacherId,
                        subjectId: id,
                        courseId: selectedCourseId,
                    },
                },
                create: {
                    teacherId,
                    subjectId: id,
                    courseId: selectedCourseId,
                    isActive: true,
                },
                update: {
                    isActive: true,
                },
            });
        }

        if (schedules !== undefined) {
            if (selectedCourseId == null) {
                throw badRequest(
                    'Seleccioná un curso para configurar horarios.'
                );
            }

            const course = await tx.course.findFirst({
                where: {
                    id: selectedCourseId,
                    institutionId: subject.institutionId,
                },
                select: { id: true },
            });

            if (!course) {
                throw badRequest(
                    'El curso no pertenece a la institución.'
                );
            }

            const existingSchedules =
                await tx.subjectSchedule.findMany({
                    where: {
                        subjectId: id,
                        courseId: selectedCourseId,
                    },
                });

            const incomingIds = new Set(
                schedules
                    .filter(schedule => schedule.id != null)
                    .map(schedule => Number(schedule.id))
            );

            for (const schedule of schedules) {
                const data = {
                    day: schedule.day,
                    shift: schedule.shift,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                };

                if (schedule.id != null) {
                    const existing = existingSchedules.find(
                        item => item.id === Number(schedule.id)
                    );

                    if (!existing) {
                        throw badRequest(
                            'Uno de los horarios no pertenece a esta materia y curso.'
                        );
                    }

                    await tx.subjectSchedule.update({
                        where: { id: existing.id },
                        data,
                    });
                } else {
                    await tx.subjectSchedule.create({
                        data: {
                            ...data,
                            subjectId: id,
                            courseId: selectedCourseId,
                        },
                    });
                }
            }

            for (const existing of existingSchedules) {
                if (!incomingIds.has(existing.id)) {
                    // Se conserva la protección existente:
                    // un horario con avisos vinculados no
                    // debe eliminarse accidentalmente.
                    await tx.subjectSchedule.delete({
                        where: { id: existing.id },
                    });
                }
            }
        }

        return tx.subject.findUnique({
            where: { id: updated.id },
            include: subjectInclude,
        });
    });
};

export const deleteSubject = (id, institutionId) => {
    const prisma = getPrisma();

    return prisma.subject.delete({
        where: {
            id,
            ...(institutionId != null
                ? { institutionId }
                : {}),
        },
    });
};
