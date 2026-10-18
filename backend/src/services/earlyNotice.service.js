import { notificationService } from './notification.service.js';

import { earlyNoticeRepository as repo, createNoticeWithClasses } from '../repositories/earlyNotice.repository.js';

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const fail = (status, message) => {
    throw new HttpError(status, message);
};

const integer = (value, field) => {
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number <= 0) {
        fail(400, `${field} debe ser un entero positivo`);
    }

    return number;
};

const has = (obj, key) =>
    Object.prototype.hasOwnProperty.call(obj, key);

const TYPES = ['ABSENCE', 'LATE_ARRIVAL', 'ATTENDANCE_CONFIRMED', 'VIRTUAL_SYNCHRONOUS', 'VIRTUAL_ASYNCHRONOUS'];
const STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED'];

const DAYS = [
    'DOMINGO',
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
];

const parseDate = (value) => {
    if (
        typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        fail(400, 'La fecha debe tener formato YYYY-MM-DD');
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
    ) {
        fail(400, 'Fecha inválida');
    }

    return date;
};

const cleanReason = (value) => {
    if (typeof value !== 'string' || !value.trim()) {
        fail(400, 'El motivo es obligatorio');
    }

    const reason = value.trim();

    if (reason.length > 2000) {
        fail(400, 'El motivo no puede superar 2000 caracteres');
    }

    return reason;
};

/**
 * Valida la hora estimada de llegada frente al horario de clase.
 * Se guarda como texto HH:mm para conservar el formato del horario.
 */
const validateEstimatedArrival = (type, value, startTime, endTime) => {
    if (type !== 'LATE_ARRIVAL') {
        return null;
    }

    if (
        typeof value !== 'string' ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ) {
        fail(
            400,
            'La hora estimada de llegada es obligatoria y debe tener formato HH:mm'
        );
    }

    const toMinutes = (time) => {
        if (
            typeof time !== 'string' ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
        ) {
            fail(
                409,
                'El horario de clase registrado no tiene un formato válido'
            );
        }

        const [hours, minutes] = time.split(':').map(Number);

        return hours * 60 + minutes;
    };

    const arrival = toMinutes(value);
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);

    if (end <= start) {
        fail(
            409,
            'El horario de clase debe terminar después de comenzar'
        );
    }

    if (arrival <= start || arrival >= end) {
        fail(
            400,
            'La llegada estimada debe ser posterior al inicio y anterior al fin de la clase'
        );
    }

    return value;
};

const getContext = async (jwtUser) => {
    const id = Number(
        jwtUser?.id ?? jwtUser?.userId ?? jwtUser?.sub
    );

    if (!Number.isSafeInteger(id) || id <= 0) {
        fail(401, 'La sesión no contiene un usuario válido');
    }

    const user = await repo.findUser(id);

    if (!user || !user.isActive) {
        fail(401, 'Usuario inexistente o inactivo');
    }

    const roles = [];

    if (user.directorProfile) {
        roles.push('DIRECTOR');
    }

    if (user.preceptorProfile) {
        roles.push('PRECEPTOR');
    }

    if (user.teacherProfile) {
        roles.push('TEACHER');
    }

    if (user.studentProfile) {
        roles.push('STUDENT');
    }

    return {
        id: user.id,
        institutionId: user.institutionId,
        isSuperAdmin: user.isSuperAdmin === true,
        roles,
        teacherProfileId: user.teacherProfile?.id ?? null,
    };
};

const isAuthority = (user) =>
    user.isSuperAdmin ||
    user.roles.includes('DIRECTOR') ||
    user.roles.includes('PRECEPTOR');

const canCreateNotices = (user) =>
    isAuthority(user) ||
    user.roles.includes('TEACHER');

const isResponsibleTeacher = (user, notice) =>
    user.roles.includes('TEACHER') &&
    notice.teacherUserId === user.id;

const isStudentOnly = (user) =>
    !user.isSuperAdmin &&
    user.roles.includes('STUDENT') &&
    !user.roles.includes('TEACHER') &&
    !user.roles.includes('DIRECTOR') &&
    !user.roles.includes('PRECEPTOR');

const checkInstitution = (user, institutionId) => {
    if (
        !user.isSuperAdmin &&
        user.institutionId !== institutionId
    ) {
        fail(403, 'No tenés acceso a esta institución');
    }
};

const checkNoticeAccess = (user, notice) => {
    if (!notice) {
        fail(404, 'Aviso no encontrado');
    }

    checkInstitution(user, notice.institutionId);
};

const loadNotice = async (user, id) => {
    const notice = await repo.findById(
        integer(id, 'id')
    );

    checkNoticeAccess(user, notice);

    return notice;
};

/**
 * Verifica que una asignación docente y un horario
 * puedan utilizarse para crear o modificar un aviso.
 */
const validateAssignment = async (
    user,
    teacherSubjectId,
    scheduleId,
    classDate
) => {
    const assignment = await repo.findAssignment(
        integer(teacherSubjectId, 'teacherSubjectId')
    );

    if (!assignment) {
        fail(404, 'Asignación docente no encontrada');
    }

    if (!assignment.isActive) {
        fail(
            409,
            'La asignación docente ya no está vigente'
        );
    }

    if (!assignment.subject?.isActive) {
        fail(
            409,
            'No se pueden generar avisos para una materia inactiva'
        );
    }

    if (!assignment.teacher?.user?.isActive) {
        fail(
            409,
            'El docente responsable está inactivo'
        );
    }

    const institutionId =
        assignment.course.institutionId;

    checkInstitution(user, institutionId);

    if (
        assignment.subject.institutionId !==
        institutionId
    ) {
        fail(
            400,
            'La materia pertenece a otra institución'
        );
    }

    if (
        assignment.teacher.user.institutionId !==
        institutionId
    ) {
        fail(
            400,
            'El docente pertenece a otra institución'
        );
    }

    if (
        !isAuthority(user) &&
        user.teacherProfileId !== assignment.teacherId
    ) {
        fail(
            403,
            'No sos el docente asignado a esta materia'
        );
    }

    const schedule = await repo.findSchedule(
        integer(scheduleId, 'scheduleId')
    );

    if (!schedule) {
        fail(404, 'Horario no encontrado');
    }

    if (
        schedule.courseId !== assignment.courseId ||
        schedule.subjectId !== assignment.subjectId
    ) {
        fail(
            400,
            'El horario no corresponde a esa materia y curso'
        );
    }

    const date = parseDate(classDate);

    if (DAYS[date.getUTCDay()] !== schedule.day) {
        fail(
            400,
            'La fecha no coincide con el día del horario'
        );
    }

    return {
        assignment,
        schedule,
        date,
        institutionId,
    };
};

export const earlyNoticeService = {
    /** Crea un aviso para clases concretas del mismo docente, en varios cursos/materias. */
    async createMultiple(jwtUser, body) {
        const user = await getContext(jwtUser);
        if (!canCreateNotices(user)) fail(403, 'No tenés permisos para crear avisos');
        if (!TYPES.includes(body?.type)) fail(400, 'Tipo de aviso inválido');
        if (!Array.isArray(body?.classes) || !body.classes.length || body.classes.length > 120) {
            fail(400, 'Seleccioná entre 1 y 120 clases');
        }
        const periodStart = parseDate(body.periodStart);
        const periodEnd = parseDate(body.periodEnd || body.periodStart);
        const span = Math.round((periodEnd - periodStart) / 86400000);
        if (span < 0 || span > 90) fail(400, 'El período debe tener entre 1 y 91 días inclusive');
        const reason = cleanReason(body.reason);
        const classes = [];
        const seen = new Set();
        let teacherId = null;
        let teacherUserId = null;
        let institutionId = null;
        const assignmentById = new Map();
        for (const row of body.classes) {
            if (!row || typeof row !== 'object') fail(400, 'Clase inválida');
            const teacherSubjectId = integer(row.teacherSubjectId ?? body.teacherSubjectId, 'teacherSubjectId');
            const { assignment, schedule, date, institutionId: inst } = await validateAssignment(
                user, teacherSubjectId, row.scheduleId, row.classDate
            );
            if (date < periodStart || date > periodEnd) fail(400, 'Hay clases fuera del período indicado');
            if (teacherId !== null && teacherId !== assignment.teacherId) {
                fail(400, 'Todas las clases deben pertenecer al mismo docente');
            }
            if (institutionId !== null && institutionId !== inst) {
                fail(400, 'No se pueden combinar instituciones');
            }
            teacherId = assignment.teacherId;
            teacherUserId = assignment.teacher.userId;
            institutionId = inst;
            assignmentById.set(assignment.id, assignment);
            const key = `${assignment.id}:${schedule.id}:${row.classDate}`;
            if (seen.has(key)) fail(400, 'Hay clases duplicadas');
            seen.add(key);
            classes.push({
                teacherSubjectId: assignment.id, scheduleId: schedule.id,
                classDate: date, day: schedule.day, shift: schedule.shift,
                startTime: schedule.startTime, endTime: schedule.endTime,
            });
        }
        classes.sort((a, b) => a.classDate - b.classDate || a.startTime.localeCompare(b.startTime));
        const first = classes[0];
        const firstAssignment = assignmentById.get(first.teacherSubjectId);
        const isOwnTeacher = user.roles.includes('TEACHER') && user.teacherProfileId === teacherId;
        const status = isOwnTeacher ? 'CONFIRMED' : 'PENDING';
        let estimatedArrivalTime = null;
        if (body.type === 'LATE_ARRIVAL') {
            for (const item of classes) {
                estimatedArrivalTime = validateEstimatedArrival(
                    body.type, body.estimatedArrivalTime, item.startTime, item.endTime
                );
            }
        }
        const virtualMeetingUrl = body.type === 'VIRTUAL_SYNCHRONOUS'
            ? String(body.virtualMeetingUrl || '').trim() : null;
        const virtualInstructions = body.type === 'VIRTUAL_ASYNCHRONOUS'
            ? String(body.virtualInstructions || '').trim() : null;
        if (body.type === 'VIRTUAL_SYNCHRONOUS') {
            try {
                const url = new URL(virtualMeetingUrl);
                if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
            } catch { fail(400, 'Ingresá un enlace válido de videollamada (https://...)'); }
        }
        if (body.type === 'VIRTUAL_ASYNCHRONOUS' && !virtualInstructions) {
            fail(400, 'Indicá el material o las instrucciones de la clase virtual');
        }
        if (virtualInstructions?.length > 5000) fail(400, 'Instrucciones demasiado extensas');
        const data = {
            type: body.type, status, reason, estimatedArrivalTime,
            virtualMeetingUrl, virtualInstructions,
            institutionId, teacherSubjectId: first.teacherSubjectId,
            subjectId: firstAssignment.subjectId, courseId: firstAssignment.courseId,
            teacherUserId, createdById: user.id, updatedById: user.id,
            classDate: first.classDate, periodStart, periodEnd,
            scheduleId: first.scheduleId, day: first.day, shift: first.shift,
            startTime: first.startTime, endTime: first.endTime,
            ...(status === 'CONFIRMED' ? { confirmedById: user.id, confirmedAt: new Date() } : {}),
        };
        const notice = await createNoticeWithClasses(data, classes, user.id);
        await notificationService.safePublish(notice);
        return { ...notice, affectedClasses: classes, revision: 1 };
    },

    /**
     * Opciones para el formulario de creación.
     *
     * SUPER_ADMIN:
     *   Todas las instituciones.
     *
     * DIRECTOR / PRECEPTOR:
     *   Todas las asignaciones vigentes de su institución.
     *
     * TEACHER:
     *   Solo sus asignaciones vigentes.
     *
     * STUDENT:
     *   Sin autorización.
     */
    async getCreationOptions(jwtUser) {
        const user = await getContext(jwtUser);

        if (!canCreateNotices(user)) {
            fail(
                403,
                'No tenés permisos para crear avisos tempranos'
            );
        }

        if (
            !user.isSuperAdmin &&
            !user.institutionId
        ) {
            fail(
                403,
                'Usuario sin institución asignada'
            );
        }

        const teacherProfileId =
            isAuthority(user)
                ? null
                : user.teacherProfileId;

        if (
            !isAuthority(user) &&
            !teacherProfileId
        ) {
            fail(
                403,
                'No tenés un perfil docente válido'
            );
        }

        return repo.listCreationOptions({
            institutionId: user.isSuperAdmin
                ? null
                : user.institutionId,

            teacherProfileId,
        });
    },

    /**
     * Listado de avisos.
     *
     * Los estudiantes solo reciben avisos confirmados.
     * Las autoridades y docentes pueden consultar
     * los estados del proceso de validación.
     */
    async list(jwtUser, query = {}) {
        const user = await getContext(jwtUser);

        const page = Math.max(
            1,
            Number(query.page) || 1
        );

        const limit = Math.min(
            100,
            Math.max(1, Number(query.limit) || 20)
        );

        const where = {};

        if (user.isSuperAdmin) {
            if (query.institutionId) {
                where.institutionId = integer(
                    query.institutionId,
                    'institutionId'
                );
            }
        } else {
            if (!user.institutionId) {
                fail(
                    403,
                    'Usuario sin institución asignada'
                );
            }

            where.institutionId =
                user.institutionId;
        }

        if (query.status) {
            if (!STATUSES.includes(query.status)) {
                fail(400, 'Estado inválido');
            }

            where.status = query.status;
        }

        if (isStudentOnly(user)) {
            if (
                query.status &&
                query.status !== 'CONFIRMED'
            ) {
                fail(
                    403,
                    'Los estudiantes solo pueden consultar avisos confirmados'
                );
            }

            where.status = 'CONFIRMED';
            where.OR = [
                { course: { students: { some: { student: { userId: user.id } } } } },
                { affectedClasses: { some: { teacherSubject: { course: { students: { some: { student: { userId: user.id } } } } } } } },
            ];
        }

        if (query.courseId) {
            where.courseId = integer(
                query.courseId,
                'courseId'
            );
        }

        if (query.teacherSubjectId) {
            where.teacherSubjectId = integer(
                query.teacherSubjectId,
                'teacherSubjectId'
            );
        }

        if (query.classDate) {
            where.classDate = parseDate(
                query.classDate
            );
        }

        if (query.includeInactive === 'true') {
            if (!isAuthority(user)) {
                fail(
                    403,
                    'No podés consultar avisos desactivados'
                );
            }
        } else {
            where.isActive = true;
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            repo.findMany(where, skip, limit),
            repo.count(where),
        ]);

        return {
            data,

            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(
                    total / limit
                ),
            },
        };
    },

    /**
     * Consulta de un aviso concreto.
     */
    async getById(jwtUser, id) {
        const user = await getContext(jwtUser);
        const notice = await loadNotice(user, id);

        if (
            !notice.isActive &&
            !isAuthority(user)
        ) {
            fail(404, 'Aviso no encontrado');
        }

        if (
            isStudentOnly(user) &&
            (notice.status !== 'CONFIRMED' ||
                !(await repo.isStudentEnrolled(notice.courseId, user.id)) &&
                !(await Promise.all((notice.classes || []).map((c) => repo.isStudentEnrolled(c.teacherSubject.course.id, user.id)))).some(Boolean))
        ) {
            fail(404, 'Aviso no encontrado');
        }

        return notice;
    },

    /**
     * Creación de avisos.
     *
     * Si lo crea el docente responsable:
     *   CONFIRMED.
     *
     * Si lo crea una autoridad:
     *   PENDING.
     */
    async create(jwtUser, body) {
        const user = await getContext(jwtUser);

        if (!canCreateNotices(user)) {
            fail(
                403,
                'No tenés permisos para crear avisos'
            );
        }

        if (!TYPES.includes(body?.type)) {
            fail(400, 'Tipo de aviso inválido');
        }

        const {
            assignment,
            schedule,
            date,
            institutionId,
        } = await validateAssignment(
            user,
            body.teacherSubjectId,
            body.scheduleId,
            body.classDate
        );

        const isOwnTeacher =
            user.roles.includes('TEACHER') &&
            user.teacherProfileId ===
            assignment.teacherId;

        const status = isOwnTeacher
            ? 'CONFIRMED'
            : 'PENDING';

        const createdNotice = await repo.create({
            type: body.type,
            status,
            classDate: date,
            reason: cleanReason(body.reason),

            estimatedArrivalTime: validateEstimatedArrival(
                body.type,
                body.estimatedArrivalTime,
                schedule.startTime,
                schedule.endTime
            ),

            institutionId,

            teacherSubjectId: assignment.id,
            subjectId: assignment.subjectId,
            courseId: assignment.courseId,

            scheduleId: schedule.id,
            day: schedule.day,
            shift: schedule.shift,
            startTime: schedule.startTime,
            endTime: schedule.endTime,

            teacherUserId:
                assignment.teacher.userId,

            createdById: user.id,
            updatedById: user.id,

            ...(status === 'CONFIRMED'
                ? {
                    confirmedById: user.id,
                    confirmedAt: new Date(),
                }
                : {}),
        });

        // El registro del aviso no se pierde si falla la creación de notificaciones.
        await notificationService.safePublish(createdNotice);
        return createdNotice;
    },

    /**
     * Edición de avisos.
     *
     * Pendiente:
     *   Autoridad o docente responsable.
     *
     * Confirmado:
     *   Solo docente responsable.
     *
     * Rechazado:
     *   Solo docente responsable, por ahora.
     *
     * El reenvío de rechazados se implementará
     * como una operación independiente.
     */
    async update(jwtUser, id, body) {
        const user = await getContext(jwtUser);
        const notice = await loadNotice(user, id);

        if (!notice.isActive) {
            fail(
                409,
                'No se puede editar un aviso desactivado'
            );
        }

        const responsible =
            isResponsibleTeacher(user, notice);

        if (
            !responsible &&
            !(
                isAuthority(user) &&
                notice.status === 'PENDING'
            )
        ) {
            fail(
                403,
                'No tenés permisos para editar este aviso'
            );
        }

        if (
            notice.status === 'CONFIRMED' &&
            !responsible
        ) {
            fail(
                403,
                'Solo el docente puede editar un aviso confirmado'
            );
        }

        const data = {
            updatedById: user.id,
        };

        if (has(body, 'reason')) {
            data.reason = cleanReason(
                body.reason
            );
        }

        if (has(body, 'type')) {
            if (!TYPES.includes(body.type)) {
                fail(
                    400,
                    'Tipo de aviso inválido'
                );
            }

            data.type = body.type;
        }

        if (
            has(body, 'classDate') ||
            has(body, 'scheduleId')
        ) {
            const classDate = has(
                body,
                'classDate'
            )
                ? body.classDate
                : notice.classDate
                    .toISOString()
                    .slice(0, 10);

            const scheduleId = has(
                body,
                'scheduleId'
            )
                ? body.scheduleId
                : notice.scheduleId;

            if (!scheduleId) {
                fail(
                    400,
                    'El aviso no tiene un horario asociado'
                );
            }

            const validated =
                await validateAssignment(
                    user,
                    notice.teacherSubjectId,
                    scheduleId,
                    classDate
                );

            data.classDate =
                validated.date;

            data.scheduleId =
                validated.schedule.id;

            data.day =
                validated.schedule.day;

            data.shift =
                validated.schedule.shift;

            data.startTime =
                validated.schedule.startTime;

            data.endTime =
                validated.schedule.endTime;
        }

        // Valida la combinación completa cuando cambia
        // el tipo, la hora prevista, la fecha o el horario.
        const effectiveType = data.type ?? notice.type;
        const effectiveStart = data.startTime ?? notice.startTime;
        const effectiveEnd = data.endTime ?? notice.endTime;

        const effectiveArrival = has(
            body,
            'estimatedArrivalTime'
        )
            ? body.estimatedArrivalTime
            : notice.estimatedArrivalTime;

        if (
            has(body, 'type') ||
            has(body, 'estimatedArrivalTime') ||
            has(body, 'classDate') ||
            has(body, 'scheduleId')
        ) {
            data.estimatedArrivalTime = validateEstimatedArrival(
                effectiveType,
                effectiveArrival,
                effectiveStart,
                effectiveEnd
            );
        }

        return repo.update(
            notice.id,
            data
        );
    },

    /**
     * Confirmación del docente responsable.
     */
    async confirm(jwtUser, id) {
        const user = await getContext(jwtUser);
        const notice = await loadNotice(user, id);

        if (!isResponsibleTeacher(user, notice)) {
            fail(
                403,
                'Solo el docente responsable puede confirmar'
            );
        }

        if (
            !notice.isActive ||
            notice.status !== 'PENDING'
        ) {
            fail(
                409,
                'El aviso no está pendiente y activo'
            );
        }

        const confirmedNotice = await repo.update(notice.id, {
            status: 'CONFIRMED',

            confirmedAt: new Date(),
            confirmedById: user.id,

            rejectedAt: null,
            rejectionReason: null,

            updatedById: user.id,
        });
        await notificationService.safePublish(confirmedNotice);
        return confirmedNotice;
    },

    /**
     * Rechazo del docente responsable.
     */
    async reject(jwtUser, id, body) {
        const user = await getContext(jwtUser);
        const notice = await loadNotice(user, id);

        if (!isResponsibleTeacher(user, notice)) {
            fail(
                403,
                'Solo el docente responsable puede rechazar'
            );
        }

        if (
            !notice.isActive ||
            notice.status !== 'PENDING'
        ) {
            fail(
                409,
                'El aviso no está pendiente y activo'
            );
        }

        const rejectedNotice = await repo.update(notice.id, {
            status: 'REJECTED',

            rejectionReason: cleanReason(
                body?.rejectionReason
            ),

            rejectedAt: new Date(),

            confirmedAt: null,
            confirmedById: null,

            updatedById: user.id,
        });
        await notificationService.safePublish(rejectedNotice);
        return rejectedNotice;
    },

    /**
     * Desactivación lógica.
     *
     * Conserva el registro para consulta histórica.
     */
    async deactivate(jwtUser, id) {
        const user = await getContext(jwtUser);
        const notice = await loadNotice(user, id);

        if (!isAuthority(user)) {
            fail(
                403,
                'Solo una autoridad puede desactivar avisos'
            );
        }

        if (!notice.isActive) {
            fail(
                409,
                'El aviso ya está desactivado'
            );
        }

        return repo.update(notice.id, {
            isActive: false,
            updatedById: user.id,
        });
    },
};
