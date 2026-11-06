
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
        where: {
            deletedAt: null,
            ...(institutionId != null ? { institutionId } : {}),
        },
        include: subjectInclude,
        orderBy: { nombre: 'asc' },
    });
};

export const findSubject = (id, institutionId = null) => {
    const prisma = getPrisma();

    return prisma.subject.findFirst({
        where: {
            id,
            deletedAt: null,
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
    careerId,
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
                    careerId,
                    career: { institutionId },
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
                    modality: schedule.modality,
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
        careerId,
        courseId,
        schedules,
    }
) => {
    const prisma = getPrisma();

    return prisma.$transaction(async tx => {
        const subject = await tx.subject.findFirst({
            where: {
                id,
                deletedAt: null,
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

        // Si viene la carrera seleccionada, validar también su relación con el curso
        // aunque el docente responsable permanezca igual.
        if (careerId !== undefined && selectedCourseId != null) {
            const selectedCourse = await tx.course.findFirst({
                where: {
                    id: selectedCourseId,
                    institutionId: subject.institutionId,
                    careerId,
                    career: { institutionId: subject.institutionId },
                },
                select: { id: true },
            });
            if (!selectedCourse) throw badRequest('La carrera no corresponde al curso y la institución seleccionados.');
        }

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
                        ...(careerId !== undefined ? {
                            careerId,
                            career: { institutionId: subject.institutionId },
                        } : {}),
                    },
                    select: { id: true },
                }),
            ]);

            if (!teacher || !course) {
                throw badRequest(
                    'El docente o el curso no pertenece a la institución.'
                );
            }

            // Serializa los cambios de docente frente a nuevas asignaciones
            // desde «Docentes y materias». El índice único parcial conserva
            // la garantía incluso bajo concurrencia en PostgreSQL.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(${id}::integer, ${selectedCourseId}::integer)`;

            const currentActiveAssignment = await tx.teacherSubject.findFirst({
                where: {
                    subjectId: id,
                    courseId: selectedCourseId,
                    isActive: true,
                },
                select: {
                    id: true,
                    teacherId: true,
                },
            });

            // Si ya está asignado el mismo docente, no hay nada que migrar.
            if (currentActiveAssignment?.teacherId !== teacherId) {
                const historicalAssignmentForNewTeacher = await tx.teacherSubject.findFirst({
                    where: {
                        subjectId: id,
                        courseId: selectedCourseId,
                        teacherId,
                    },
                    select: {
                        id: true,
                        isActive: true,
                    },
                });

                if (currentActiveAssignment) {
                    if (historicalAssignmentForNewTeacher) {
                        const previousAssignmentId = currentActiveAssignment.id;
                        const nextAssignmentId = historicalAssignmentForNewTeacher.id;

                        // Desactivar primero el responsable anterior: el índice único
                        // parcial de PostgreSQL impide dos docentes activos por curso/materia
                        // incluso temporalmente dentro de esta transacción.
                        await tx.teacherSubject.update({
                            where: { id: previousAssignmentId },
                            data: { isActive: false },
                        });

                        // Reactivar el registro histórico del nuevo docente y moverle
                        // todo el contenido y seguimiento pedagógico del docente anterior.
                        await tx.teacherSubject.update({
                            where: { id: nextAssignmentId },
                            data: { isActive: true },
                        });

                        await tx.earlyNoticeClass.updateMany({
                            where: { teacherSubjectId: previousAssignmentId },
                            data: { teacherSubjectId: nextAssignmentId },
                        });
                        await tx.activity.updateMany({
                            where: { teacherSubjectId: previousAssignmentId },
                            data: { teacherSubjectId: nextAssignmentId },
                        });
                        await tx.unit.updateMany({
                            where: { teacherSubjectId: previousAssignmentId },
                            data: { teacherSubjectId: nextAssignmentId },
                        });
                        await tx.studyMaterial.updateMany({
                            where: { teacherSubjectId: previousAssignmentId },
                            data: { teacherSubjectId: nextAssignmentId },
                        });
                        await tx.teacherSubjectContent.updateMany({
                            where: { teacherSubjectId: previousAssignmentId },
                            data: { teacherSubjectId: nextAssignmentId },
                        });

                    } else {
                        // Ruta ideal: conservar exactamente el mismo registro activo.
                        // De esta forma, actividades, unidades, materiales, historial,
                        // rankings y resultados siguen apuntando al mismo teacherSubjectId.
                        await tx.teacherSubject.update({
                            where: { id: currentActiveAssignment.id },
                            data: { teacherId, isActive: true },
                        });
                    }
                } else {
                    // No había responsable activo: se crea o reactiva uno para este curso.
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

                // Garantía de unicidad lógica: no puede quedar otra asignación activa
                // distinta a la elegida para esta materia y curso.
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
            }
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
                    modality: schedule.modality,
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

// Eliminar del catálogo sin destruir la evidencia histórica de actividades.
// Todas las asignaciones vigentes quedan desvinculadas de la docencia operativa.
export const archiveSubjectWithAssignments = (id, institutionId) => getPrisma().$transaction(async (tx) => {
    const subject = await tx.subject.findFirst({
        where: { id, deletedAt: null, ...(institutionId != null ? { institutionId } : {}) },
        select: { id: true },
    });
    if (!subject) throw Object.assign(new Error('Materia inexistente'), { status: 404 });
    const assignments = await tx.teacherSubject.findMany({
        where: { subjectId: id }, select: { id: true },
    });
    const assignmentIds = assignments.map(a => a.id);
    // Sin contenido ni historial, borramos físicamente materia y asignaciones.
    // Si existe evidencia académica, la archivamos para que siga siendo consultable.
    const [notices, affectedClasses, activities, units, materials, contents] = await Promise.all([
        tx.earlyNotice.count({ where: { subjectId: id } }),
        tx.earlyNoticeClass.count({ where: { teacherSubjectId: { in: assignmentIds } } }),
        tx.activity.count({ where: { teacherSubjectId: { in: assignmentIds } } }),
        tx.unit.count({ where: { teacherSubjectId: { in: assignmentIds } } }),
        tx.studyMaterial.count({ where: { teacherSubjectId: { in: assignmentIds } } }),
        tx.teacherSubjectContent.count({ where: { teacherSubjectId: { in: assignmentIds } } }),
    ]);
    if (![notices, affectedClasses, activities, units, materials, contents].some(Boolean)) {
        // Los horarios tienen onDelete Cascade y no hay avisos vinculados.
        await tx.teacherSubject.deleteMany({ where: { subjectId: id } });
        await tx.subject.delete({ where: { id } });
        return { id, permanentlyDeleted: true };
    }
    if (assignmentIds.length) {
        await tx.teacherSubject.updateMany({ where: { id: { in: assignmentIds } }, data: { isActive: false } });
        await tx.activity.updateMany({
            where: { teacherSubjectId: { in: assignmentIds } },
            data: { isPublished: false, status: 'INACTIVE' },
        });
        await tx.studyMaterial.updateMany({
            where: { teacherSubjectId: { in: assignmentIds } }, data: { isPublished: false },
        });
    }
    return tx.subject.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } });
});

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
