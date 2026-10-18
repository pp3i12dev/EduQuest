
import { canAnyRole } from '../config/permissions.js';
import * as subjectRepository from '../repositories/subject.repository.js';

const AVAILABLE_GAMES = [
    { id: 'pig_game', nombre: 'Pig Game' },
];

const VALID_DAYS = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
];

const VALID_SHIFTS = [
    'MANANA',
    'TARDE',
    'NOCHE',
];

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function isSuperAdmin(requester) {
    return (
        requester?.isSuperAdmin === true ||
        requester?.roles?.includes('SUPER_ADMIN')
    );
}

function assertPermission(requester) {
    if (isSuperAdmin(requester)) return;

    if (!canAnyRole(requester?.roles ?? [], 'subject:manage')) {
        throw new ServiceError(
            'No tenés permisos para esta acción.',
            403
        );
    }
}

function getInstitutionScope(requester) {
    return isSuperAdmin(requester)
        ? null
        : requester?.institutionId;
}

function getCreateInstitutionId(body, requester) {
    const institutionId = isSuperAdmin(requester)
        ? Number(body.institutionId)
        : Number(requester?.institutionId);

    if (
        !Number.isInteger(institutionId) ||
        institutionId <= 0
    ) {
        throw new ServiceError(
            'Seleccioná una institución válida.'
        );
    }

    return institutionId;
}

function parsePositiveId(value, field) {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new ServiceError(
            `${field} debe ser un identificador válido.`
        );
    }

    return id;
}

function validateSchedules(schedules) {
    if (schedules === undefined) return undefined;

    if (!Array.isArray(schedules)) {
        throw new ServiceError(
            'Los horarios deben enviarse como una lista.'
        );
    }

    const seen = new Set();

    return schedules.map((schedule, index) => {
        const day = schedule?.day;
        const shift = schedule?.shift;
        const startTime = schedule?.startTime;
        const endTime = schedule?.endTime;

        if (!VALID_DAYS.includes(day)) {
            throw new ServiceError(
                `Día inválido en el horario ${index + 1}.`
            );
        }

        if (!VALID_SHIFTS.includes(shift)) {
            throw new ServiceError(
                `Turno inválido en el horario ${index + 1}.`
            );
        }

        const timeRegex =
            /^([01]\d|2[0-3]):[0-5]\d$/;

        if (
            !timeRegex.test(startTime ?? '') ||
            !timeRegex.test(endTime ?? '')
        ) {
            throw new ServiceError(
                `Formato de hora inválido en el horario ${index + 1}.`
            );
        }

        if (startTime >= endTime) {
            throw new ServiceError(
                `La hora de inicio debe ser anterior a la de finalización en el horario ${index + 1}.`
            );
        }

        const key = `${day}|${shift}|${startTime}|${endTime}`;

        if (seen.has(key)) {
            throw new ServiceError(
                'No podés repetir el mismo horario.'
            );
        }

        seen.add(key);

        return {
            ...(schedule.id != null
                ? {
                    id: parsePositiveId(
                        schedule.id,
                        'ID del horario'
                    ),
                }
                : {}),
            day,
            shift,
            startTime,
            endTime,
        };
    });
}

function handleDatabaseError(error) {
    if (error?.status) throw error;

    if (error?.code === 'P2025') {
        throw new ServiceError(
            'El registro solicitado no existe.',
            404
        );
    }

    if (error?.code === 'P2002') {
        throw new ServiceError(
            'Ya existe una asignación con esos datos.',
            409
        );
    }

    if (error?.code === 'P2003') {
        throw new ServiceError(
            'No se puede eliminar este registro porque tiene información vinculada.',
            409
        );
    }

    throw error;
}

export const listSubjectsService = requester => {
    assertPermission(requester);

    const institutionId = getInstitutionScope(requester);

    if (!isSuperAdmin(requester) && institutionId == null) {
        throw new ServiceError(
            'El usuario no tiene una institución asignada.',
            403
        );
    }

    return subjectRepository.listSubjects(institutionId);
};

export const listSubjectGamesService = requester => {
    assertPermission(requester);
    return AVAILABLE_GAMES;
};

export const createSubjectService = async (body, requester) => {
    assertPermission(requester);

    const nombre = String(body?.nombre ?? '').trim();

    if (!nombre) {
        throw new ServiceError(
            'Ingresá el nombre de la materia.'
        );
    }

    const institutionId = getCreateInstitutionId(
        body,
        requester
    );

    const teacherId = parsePositiveId(
        body.teacherId,
        'Docente'
    );

    const courseId = parsePositiveId(
        body.courseId,
        'Curso'
    );

    const schedules =
        validateSchedules(body.schedules ?? []);

    try {
        const subject = await subjectRepository.createSubject({
            nombre,
            institutionId,
            teacherId,
            courseId,
            schedules,
        });

        if (!subject) {
            throw new ServiceError(
                'El docente o curso no pertenece a la institución seleccionada.'
            );
        }

        return subject;
    } catch (error) {
        handleDatabaseError(error);
    }
};

export const updateSubjectService = async (
    id,
    body,
    requester
) => {
    assertPermission(requester);

    const subjectId = parsePositiveId(
        id,
        'Materia'
    );

    const nombre =
        body.nombre === undefined
            ? undefined
            : String(body.nombre).trim();

    if (nombre !== undefined && !nombre) {
        throw new ServiceError(
            'El nombre de la materia no puede estar vacío.'
        );
    }

    if (
        body.isActive !== undefined &&
        typeof body.isActive !== 'boolean'
    ) {
        throw new ServiceError(
            'El estado de la materia debe ser verdadero o falso.'
        );
    }

    const teacherId =
        body.teacherId === undefined
            ? undefined
            : parsePositiveId(body.teacherId, 'Docente');

    const courseId =
        body.courseId === undefined
            ? undefined
            : parsePositiveId(body.courseId, 'Curso');

    const schedules =
        validateSchedules(body.schedules);

    try {
        const result = await subjectRepository.updateSubject(
            subjectId,
            getInstitutionScope(requester),
            {
                nombre,
                isActive: body.isActive,
                teacherId,
                courseId,
                schedules,
            }
        );

        if (!result) {
            throw new ServiceError(
                'Materia no encontrada.',
                404
            );
        }

        return result;
    } catch (error) {
        handleDatabaseError(error);
    }
};

export const deleteSubjectService = async (
    id,
    requester
) => {
    assertPermission(requester);

    const subjectId = parsePositiveId(
        id,
        'Materia'
    );

    const existing = await subjectRepository.findSubject(
        subjectId,
        getInstitutionScope(requester)
    );

    if (!existing) {
        throw new ServiceError(
            'Materia no encontrada.',
            404
        );
    }

    // Evitamos eliminar materias con relaciones históricas.
    if (
        existing.teachers.length > 0 ||
        existing.schedules.length > 0
    ) {
        throw new ServiceError(
            'Esta materia tiene asignaciones u horarios. Desactivala en lugar de eliminarla.',
            409
        );
    }

    try {
        await subjectRepository.deleteSubject(
            subjectId,
            getInstitutionScope(requester)
        );
    } catch (error) {
        handleDatabaseError(error);
    }
};
