
import { getPrisma } from '../config/prisma.js';

const prisma = getPrisma();

const userSummary = {
    id: true,
    firstName: true,
    lastName: true,
};

export const noticeInclude = {
    institution: {
        select: {
            id: true,
            nombre: true,
        },
    },

    subject: {
        select: {
            id: true,
            nombre: true,
        },
    },

    course: {
        select: {
            id: true,
            nombre: true,
            careerId: true,
        },
    },

    teacherSubject: {
        include: {
            teacher: {
                include: {
                    user: {
                        select: userSummary,
                    },
                },
            },
        },
    },

    createdBy: {
        select: userSummary,
    },
    affectedClasses: {
        orderBy: [{ classDate: 'asc' }, { startTime: 'asc' }],
        include: {
            teacherSubject: {
                select: {
                    id: true,
                    subject: { select: { id: true, nombre: true } },
                    course: { select: { id: true, nombre: true } },
                },
            },
        },
    },
};

// Prisma usa affectedClasses; la API pública existente expone classes.
const normalizeNotice = (notice) => notice
    ? { ...notice, classes: notice.affectedClasses ?? [] }
    : notice;

const normalizeNotices = (notices) => notices.map(normalizeNotice);

/**
 * Repositorio de Avisos Tempranos.
 *
 * Las validaciones de permisos se realizan en el servicio.
 * Este repositorio aplica los filtros institucionales y
 * de asignaciones que recibe.
 */
export const createNoticeWithClasses = (data, classes, creatorId) =>
    prisma.$transaction(async (tx) => {
        const notice = await tx.earlyNotice.create({ data });
        await tx.earlyNoticeClass.createMany({
            data: classes.map((item) => ({
                earlyNoticeId: notice.id,
                teacherSubjectId: item.teacherSubjectId,
                scheduleId: item.scheduleId,
                classDate: item.classDate,
                day: item.day,
                shift: item.shift,
                startTime: item.startTime,
                endTime: item.endTime,
            })),
        });
        await tx.earlyNoticeRevision.create({
            data: {
                earlyNoticeId: notice.id,
                version: 1,
                action: 'CREATED',
                createdById: creatorId,
                snapshot: {
                    type: data.type,
                    status: data.status,
                    reason: data.reason,
                    periodStart: data.periodStart?.toISOString().slice(0, 10),
                    periodEnd: data.periodEnd?.toISOString().slice(0, 10),
                    virtualMeetingUrl: data.virtualMeetingUrl,
                    virtualInstructions: data.virtualInstructions,
                    classes: classes.map((c) => ({
                        teacherSubjectId: c.teacherSubjectId,
                        scheduleId: c.scheduleId,
                        classDate: c.classDate.toISOString().slice(0, 10),
                        day: c.day,
                        shift: c.shift,
                        startTime: c.startTime,
                        endTime: c.endTime,
                    })),
                },
            },
        });
        return normalizeNotice(await tx.earlyNotice.findUnique({ where: { id: notice.id }, include: noticeInclude }));
    });

export const earlyNoticeRepository = {
    findUser(id) {
        return prisma.user.findUnique({
            where: { id },

            include: {
                directorProfile: true,
                preceptorProfile: true,
                teacherProfile: true,
                studentProfile: true,
            },
        });
    },

    findAssignment(id) {
        return prisma.teacherSubject.findUnique({
            where: { id },

            include: {
                teacher: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                isActive: true,
                                institutionId: true,
                            },
                        },
                    },
                },

                subject: true,
                course: true,
            },
        });
    },

    findSchedule(id) {
        return prisma.subjectSchedule.findUnique({
            where: { id },
        });
    },

    /**
     * Obtiene las opciones para generar Avisos Tempranos.
     *
     * Parámetros:
     *
     * institutionId:
     *   - Número: limita la consulta a una institución.
     *   - null: permite consultar todas las instituciones
     *     (solo debe utilizarlo el servicio para SUPER_ADMIN).
     *
     * teacherProfileId:
     *   - Número: limita las asignaciones a ese docente.
     *   - null: permite consultar todas las asignaciones
     *     dentro del alcance institucional autorizado.
     *
     * Solo devuelve:
     *   - Asignaciones docentes activas.
     *   - Usuarios docentes activos.
     *   - Materias activas.
     *   - Cursos de la institución correspondiente.
     *
     * Los horarios se obtienen de SubjectSchedule.
     */
    async listCreationOptions({
        institutionId = null,
        teacherProfileId = null,
    } = {}) {
        const assignmentWhere = {
            isActive: true,

            teacher: {
                user: {
                    isActive: true,

                    ...(institutionId !== null
                        ? { institutionId }
                        : {}),
                },
            },

            subject: {
                isActive: true,

                ...(institutionId !== null
                    ? { institutionId }
                    : {}),
            },

            course: {
                ...(institutionId !== null
                    ? { institutionId }
                    : {}),
            },

            ...(teacherProfileId !== null
                ? { teacherId: teacherProfileId }
                : {}),
        };

        const assignments = await prisma.teacherSubject.findMany({
            where: assignmentWhere,

            select: {
                id: true,
                teacherId: true,
                subjectId: true,
                courseId: true,
                isActive: true,

                teacher: {
                    select: {
                        id: true,

                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                isActive: true,
                            },
                        },
                    },
                },

                subject: {
                    select: {
                        id: true,
                        nombre: true,
                        institutionId: true,
                        isActive: true,
                    },
                },

                course: {
                    select: {
                        id: true,
                        nombre: true,
                        institutionId: true,

                        career: {
                            select: {
                                id: true,
                                nombre: true,
                            },
                        },

                        institution: {
                            select: {
                                id: true,
                                nombre: true,
                            },
                        },
                    },
                },
            },

            orderBy: [
                {
                    course: {
                        nombre: 'asc',
                    },
                },
                {
                    subject: {
                        nombre: 'asc',
                    },
                },
            ],
        });

        /*
         * Validación adicional de consistencia institucional.
         *
         * No se ofrecen asignaciones que vinculen por error
         * una materia con un curso de otra institución.
         */
        const validAssignments = assignments.filter(
            (assignment) =>
                assignment.subject.institutionId ===
                assignment.course.institutionId
        );

        const courseIds = [
            ...new Set(
                validAssignments.map(
                    (assignment) => assignment.courseId
                )
            ),
        ];

        const subjectIds = [
            ...new Set(
                validAssignments.map(
                    (assignment) => assignment.subjectId
                )
            ),
        ];

        /*
         * Los horarios son propios de cada combinación
         * de curso y materia.
         *
         * No dependen directamente del docente asignado.
         */
        const schedules =
            courseIds.length > 0 && subjectIds.length > 0
                ? await prisma.subjectSchedule.findMany({
                    where: {
                        courseId: {
                            in: courseIds,
                        },

                        subjectId: {
                            in: subjectIds,
                        },

                        ...(institutionId !== null
                            ? {
                                course: {
                                    institutionId,
                                },
                            }
                            : {}),
                    },

                    select: {
                        id: true,
                        courseId: true,
                        subjectId: true,
                        day: true,
                        shift: true,
                        startTime: true,
                        endTime: true,
                    },

                    orderBy: [
                        {
                            day: 'asc',
                        },
                        {
                            startTime: 'asc',
                        },
                    ],
                })
                : [];

        const validPairs = new Set(
            validAssignments.map(
                (assignment) =>
                    `${assignment.courseId}:${assignment.subjectId}`
            )
        );

        const validSchedules = schedules.filter(
            (schedule) =>
                validPairs.has(
                    `${schedule.courseId}:${schedule.subjectId}`
                )
        );

        /*
         * Cada opción contiene el ID real de TeacherSubject.
         *
         * Este ID es el que debe enviarse al crear un aviso,
         * no el ID del perfil docente.
         */
        const assignmentOptions = validAssignments.map(
            (assignment) => ({
                id: assignment.id,
                teacherSubjectId: assignment.id,

                teacherId: assignment.teacherId,
                teacherUserId: assignment.teacher.user.id,

                teacher: {
                    id: assignment.teacher.id,
                    user: assignment.teacher.user,
                },

                subjectId: assignment.subjectId,
                subject: assignment.subject,

                courseId: assignment.courseId,
                course: assignment.course,

                institutionId:
                    assignment.course.institutionId,

                schedules: validSchedules.filter(
                    (schedule) =>
                        schedule.courseId ===
                        assignment.courseId &&
                        schedule.subjectId ===
                        assignment.subjectId
                ),
            })
        );

        /*
         * Cursos que tienen al menos una asignación
         * docente vigente.
         */
        const courseMap = new Map();

        for (const assignment of validAssignments) {
            if (!courseMap.has(assignment.courseId)) {
                courseMap.set(
                    assignment.courseId,
                    assignment.course
                );
            }
        }

        /*
         * Materias que tienen al menos una asignación
         * docente vigente.
         */
        const subjectMap = new Map();

        for (const assignment of validAssignments) {
            if (!subjectMap.has(assignment.subjectId)) {
                subjectMap.set(
                    assignment.subjectId,
                    assignment.subject
                );
            }
        }

        /*
         * Instituciones presentes en las asignaciones
         * disponibles.
         */
        const institutionMap = new Map();

        for (const assignment of validAssignments) {
            const institution =
                assignment.course.institution;

            if (
                institution &&
                !institutionMap.has(institution.id)
            ) {
                institutionMap.set(
                    institution.id,
                    institution
                );
            }
        }

        return {
            institutions: [
                ...institutionMap.values(),
            ].sort((a, b) =>
                a.nombre.localeCompare(b.nombre, 'es')
            ),

            courses: [
                ...courseMap.values(),
            ].sort((a, b) =>
                a.nombre.localeCompare(b.nombre, 'es')
            ),

            subjects: [
                ...subjectMap.values(),
            ].sort((a, b) =>
                a.nombre.localeCompare(b.nombre, 'es')
            ),

            assignments: assignmentOptions,

            schedules: validSchedules,
        };
    },

    findStudentsByCourse(courseId) {
        return prisma.studentCourse.findMany({
            where: { courseId, student: { user: { isActive: true } } },
            select: {
                student: {
                    select: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true, telefono: true },
                        },
                    },
                },
            },
        });
    },

    isStudentEnrolled(courseId, userId) {
        return prisma.studentCourse.findFirst({
            where: { courseId, student: { userId } },
            select: { id: true },
        });
    },

    async findById(id) {
        return normalizeNotice(await prisma.earlyNotice.findUnique({
            where: { id },
            include: noticeInclude,
        }));
    },

    async findMany(where, skip, take) {
        return normalizeNotices(await prisma.earlyNotice.findMany({
            where,

            include: noticeInclude,

            orderBy: [
                {
                    classDate: 'desc',
                },
                {
                    createdAt: 'desc',
                },
            ],

            skip,
            take,
        }));
    },

    count(where) {
        return prisma.earlyNotice.count({
            where,
        });
    },

    async create(data) {
        return normalizeNotice(await prisma.earlyNotice.create({
            data,
            include: noticeInclude,
        }));
    },

    async update(id, data) {
        return normalizeNotice(await prisma.earlyNotice.update({
            where: { id },
            data,
            include: noticeInclude,
        }));
    },

    async deactivate(id) {
        return normalizeNotice(await prisma.earlyNotice.update({
            where: { id },

            data: {
                isActive: false,
            },

            include: noticeInclude,
        }));
    },
};
