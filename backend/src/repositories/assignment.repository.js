
import { getPrisma } from '../config/prisma.js';

export const listAssignmentOptions = async (institutionId) => {
    const prisma = getPrisma();
    const institutionWhere = institutionId == null ? {} : { institutionId };

    const [courses, subjects, students, teachers] = await Promise.all([
        prisma.course.findMany({
            where: institutionWhere,
            include: { career: true, institution: { select: { id: true, nombre: true } } },
            orderBy: { nombre: 'asc' },
        }),

        prisma.subject.findMany({
            where: { ...institutionWhere, deletedAt: null },
            orderBy: { nombre: 'asc' },
        }),

        prisma.studentProfile.findMany({
            where: {
                user: {
                    ...institutionWhere, isActive: true, deletedAt: null,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        dni: true,
                        email: true,
                        isActive: true,
                    },
                },
            },
            orderBy: {
                user: {
                    lastName: 'asc',
                },
            },
        }),

        prisma.teacherProfile.findMany({
            where: {
                user: {
                    ...institutionWhere, isActive: true, deletedAt: null,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        dni: true,
                        email: true,
                        isActive: true,
                    },
                },
            },
            orderBy: {
                user: {
                    lastName: 'asc',
                },
            },
        }),
    ]);

    return {
        courses,
        subjects,
        students,
        teachers,
    };
};

export const listStudentsForCourse = async (
    institutionId,
    courseId
) => {
    const prisma = getPrisma();

    const students = await prisma.studentProfile.findMany({
        where: {
            user: {
                institutionId,
                isActive: true,
                deletedAt: null,
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    dni: true,
                    email: true,
                    isActive: true,
                },
            },
            // Mostramos también la matrícula en OTRO curso para impedir
            // asignaciones simultáneas y explicar al administrativo el conflicto.
            courses: {
                select: {
                    id: true,
                    courseId: true,
                    course: { select: { nombre: true, academicYear: true, institutionId: true } },
                },
            },
        },
        orderBy: {
            user: {
                lastName: 'asc',
            },
        },
    });

    return students.map((student) => ({
        id: student.id,
        legajoStudent: student.legajoStudent,
        user: student.user,
        assigned: student.courses.some((enrollment) => enrollment.courseId === courseId),
        assignedCourse: student.courses[0]
            ? {
                id: student.courses[0].courseId,
                nombre: student.courses[0].course.nombre,
                academicYear: student.courses[0].course.academicYear,
            }
            : null,
        assignedToOtherCourse: student.courses.some((enrollment) => enrollment.courseId !== courseId),
    }));
};

export const createStudentCourse = (studentId, courseId) => {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
        // Bloquea la matrícula de este alumno hasta terminar la transacción.
        // $executeRaw evita deserializar el resultado void de pg_advisory_xact_lock.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${studentId}::integer, 817231::integer)`;
        const existing = await tx.studentCourse.findFirst({
            where: { studentId },
            include: { course: { select: { id: true, nombre: true } } },
        });
        if (existing) {
            const error = new Error(existing.courseId === courseId
                ? 'El alumno ya está asignado a este curso'
                : `El alumno ya está inscripto en ${existing.course.nombre}. Primero quitá esa matrícula antes de asignarle otro curso.`);
            error.code = 'STUDENT_ALREADY_ENROLLED';
            throw error;
        }
        return tx.studentCourse.create({ data: { studentId, courseId } });
    });
};

export const deleteStudentCourse = (studentId, courseId) => {
    const prisma = getPrisma();

    return prisma.studentCourse.deleteMany({
        where: {
            studentId,
            courseId,
        },
    });
};

export const findStudent = (institutionId, studentId) => {
    const prisma = getPrisma();

    return prisma.studentProfile.findFirst({
        where: {
            id: studentId,
            user: {
                institutionId,
                isActive: true,
                deletedAt: null,
            },
        },
        include: {
            user: true,
        },
    });
};

export const findCourse = (institutionId, courseId) => {
    const prisma = getPrisma();

    return prisma.course.findFirst({
        where: {
            id: courseId,
            ...(institutionId == null ? {} : { institutionId }),
        },
    });
};

// Devuelve todos los docentes de la institución,
// pero considera asignados solamente a los vigentes.
export const listTeachersForCourseSubject = async (
    institutionId,
    courseId,
    subjectId
) => {
    const prisma = getPrisma();

    const teachers = await prisma.teacherProfile.findMany({
        where: {
            user: {
                institutionId,
                isActive: true,
                deletedAt: null,
            },
        },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    dni: true,
                    email: true,
                    isActive: true,
                },
            },
            teacherSubjects: {
                where: {
                    courseId,
                    subjectId,
                },
                select: {
                    id: true,
                    teacherId: true,
                    subjectId: true,
                    courseId: true,
                    isActive: true,
                },
            },
        },
        orderBy: {
            user: {
                lastName: 'asc',
            },
        },
    });

    return teachers.map((teacher) => {
        const currentAssignment =
            teacher.teacherSubjects.find(
                (assignment) => assignment.isActive
            );

        return {
            id: teacher.id,
            legajoTeacher: teacher.legajoTeacher,
            specialty: teacher.specialty,
            user: teacher.user,

            // Solo representa responsabilidad vigente.
            assigned: Boolean(currentAssignment),

            assignmentId: currentAssignment?.id ?? null,

            // Indica que este docente tuvo una asignación
            // anterior para esta materia y curso.
            hasHistory: teacher.teacherSubjects.some(
                (assignment) => !assignment.isActive
            ),
        };
    });
};

export const findTeacher = (institutionId, teacherId) => {
    const prisma = getPrisma();

    return prisma.teacherProfile.findFirst({
        where: {
            id: teacherId,
            user: {
                institutionId,
                isActive: true,
                deletedAt: null,
            },
        },
        include: {
            user: true,
        },
    });
};

export const findSubject = (institutionId, subjectId) => {
    const prisma = getPrisma();

    return prisma.subject.findFirst({
        where: {
            id: subjectId,
            institutionId,
        },
    });
};

// Consulta una asignación concreta con su institución.
// Sirve para verificar autorización antes de desactivarla.
export const findTeacherSubjectAssignment = (id) => {
    const prisma = getPrisma();

    return prisma.teacherSubject.findUnique({
        where: { id },
        include: {
            subject: {
                select: {
                    id: true,
                    institutionId: true,
                },
            },
            course: {
                select: {
                    id: true,
                    institutionId: true,
                },
            },
        },
    });
};

// Nunca reemplazar automáticamente al docente responsable desde «Asignar».
// Para cambiarlo se utiliza la edición explícita de la materia.
// El índice único parcial en PostgreSQL también protege esta regla cuando
// dos solicitudes concurrentes intentan asignar docentes distintos.
export const createTeacherSubject = (teacherId, subjectId, courseId) => {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
        // Misma clave de bloqueo usada al editar una materia.
        // $executeRaw maneja correctamente el SELECT de una función void.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${subjectId}::integer, ${courseId}::integer)`;

        const active = await tx.teacherSubject.findMany({
            where: { subjectId, courseId, isActive: true },
            select: { id: true, teacherId: true },
        });
        if (active.length > 1 || active.some(item => item.teacherId !== teacherId)) {
            const error = new Error(
                'Esta materia ya tiene un docente responsable en ese curso. ' +
                'Quitá la asignación actual antes de asignar otro docente, ' +
                'o realizá un cambio explícito desde la edición de la materia.'
            );
            error.code = 'SUBJECT_ALREADY_HAS_TEACHER';
            throw error;
        }

        if (active.length === 1) {
            return tx.teacherSubject.findUnique({
                where: { id: active[0].id },
                include: {
                    teacher: { include: { user: true } },
                    subject: true,
                    course: true,
                },
            });
        }

        // Un docente que había estado asignado puede reactivarse, sin borrar
        // el contenido histórico vinculado a su registro anterior.
        return tx.teacherSubject.upsert({
            where: { teacherId_subjectId_courseId: { teacherId, subjectId, courseId } },
            update: { isActive: true },
            create: { teacherId, subjectId, courseId, isActive: true },
            include: {
                teacher: { include: { user: true } },
                subject: true,
                course: true,
            },
        });
    });
};

// Desactiva la asignación sin eliminar el registro.
//
// La autorización institucional debe verificarse
// previamente desde assignment.service.js.
export const deleteTeacherSubject = (id) => {
    const prisma = getPrisma();

    return prisma.teacherSubject.update({
        where: {
            id,
        },
        data: {
            isActive: false,
        },
    });
};

export const listSchedules = async (
    institutionId,
    courseId,
    subjectId
) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.findMany({
        where: {
            courseId,
            subjectId,
            course: {
                ...(institutionId == null ? {} : { institutionId }),
            },
        },
        include: {
            subject: true,
            course: true,
        },
        orderBy: [
            { day: 'asc' },
            { startTime: 'asc' },
        ],
    });
};

export const findSchedule = (institutionId, id) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.findFirst({
        where: {
            id,
            course: {
                ...(institutionId == null ? {} : { institutionId }),
            },
        },
    });
};

export const listSchedulesForConflict = async (
    institutionId,
    courseId,
    day,
    excludeId = null
) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.findMany({
        where: {
            courseId,
            day,
            course: {
                ...(institutionId == null ? {} : { institutionId }),
            },
            ...(excludeId
                ? { NOT: { id: excludeId } }
                : {}),
        },
    });
};

export const createSchedule = (data) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.create({
        data,
        include: {
            subject: true,
            course: true,
        },
    });
};

export const updateSchedule = (id, data) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.update({
        where: { id },
        data,
        include: {
            subject: true,
            course: true,
        },
    });
};

export const deleteSchedule = (id) => {
    const prisma = getPrisma();

    return prisma.subjectSchedule.delete({
        where: { id },
    });
};
