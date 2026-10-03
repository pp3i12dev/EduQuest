import { canAnyRole } from '../config/permissions.js';
import * as assignmentRepository from '../repositories/assignment.repository.js';

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function assertPermission(roles, permission) {
    if (!canAnyRole(roles, permission)) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }
}

function toPositiveInt(value, fieldName) {
    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
        throw new ServiceError(`El campo "${fieldName}" no es válido`, 400);
    }

    return number;
}

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

function validateTime(value, fieldName) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
        throw new ServiceError(
            `La hora "${fieldName}" debe tener formato HH:mm`,
            400
        );
    }
}

function assertTimeRange(startTime, endTime) {
    if (startTime >= endTime) {
        throw new ServiceError(
            'La hora de inicio debe ser anterior a la hora de finalización',
            400
        );
    }
}

function assertNoScheduleConflict(schedules, startTime, endTime) {
    const conflict = schedules.some(
        (schedule) =>
            startTime < schedule.endTime &&
            endTime > schedule.startTime
    );

    if (conflict) {
        throw new ServiceError(
            'Ya existe otro horario que se superpone para este curso y día',
            409
        );
    }
}

export const listAssignmentOptionsService = async (requester) => {
    const canEnroll = canAnyRole(requester.roles, 'student:enroll');
    const canAssignTeacher = canAnyRole(
        requester.roles,
        'teacher:assignSubject'
    );
    const canSchedule = canAnyRole(
        requester.roles,
        'schedule:manage'
    );

    if (!canEnroll && !canAssignTeacher && !canSchedule) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }

    return assignmentRepository.listAssignmentOptions(
        requester.institutionId
    );
};

export const listStudentsForCourseService = async (
    courseId,
    requester
) => {
    assertPermission(requester.roles, 'student:enroll');

    const normalizedCourseId = toPositiveInt(courseId, 'courseId');

    const course = await assignmentRepository.findCourse(
        requester.institutionId,
        normalizedCourseId
    );

    if (!course) {
        throw new ServiceError('Curso no encontrado', 404);
    }

    return assignmentRepository.listStudentsForCourse(
        requester.institutionId,
        normalizedCourseId
    );
};

export const assignStudentToCourseService = async (
    body,
    requester
) => {
    assertPermission(requester.roles, 'student:enroll');

    const studentId = toPositiveInt(body.studentId, 'studentId');
    const courseId = toPositiveInt(body.courseId, 'courseId');

    const [student, course] = await Promise.all([
        assignmentRepository.findStudent(
            requester.institutionId,
            studentId
        ),
        assignmentRepository.findCourse(
            requester.institutionId,
            courseId
        ),
    ]);

    if (!student) {
        throw new ServiceError('Alumno no encontrado', 404);
    }

    if (!course) {
        throw new ServiceError('Curso no encontrado', 404);
    }

    if (!student.user.isActive) {
        throw new ServiceError(
            'No se puede asignar un alumno inactivo',
            409
        );
    }

    try {
        return await assignmentRepository.createStudentCourse(
            studentId,
            courseId
        );
    } catch (error) {
        if (error.code === 'P2002') {
            throw new ServiceError(
                'El alumno ya está asignado a este curso',
                409
            );
        }

        throw error;
    }
};

export const removeStudentFromCourseService = async (
    studentId,
    courseId,
    requester
) => {
    assertPermission(requester.roles, 'student:enroll');

    const normalizedStudentId = toPositiveInt(
        studentId,
        'studentId'
    );
    const normalizedCourseId = toPositiveInt(
        courseId,
        'courseId'
    );

    await Promise.all([
        assignmentRepository.findStudent(
            requester.institutionId,
            normalizedStudentId
        ).then((student) => {
            if (!student) {
                throw new ServiceError('Alumno no encontrado', 404);
            }
        }),
        assignmentRepository.findCourse(
            requester.institutionId,
            normalizedCourseId
        ).then((course) => {
            if (!course) {
                throw new ServiceError('Curso no encontrado', 404);
            }
        }),
    ]);

    await assignmentRepository.deleteStudentCourse(
        normalizedStudentId,
        normalizedCourseId
    );
};

export const listTeachersForCourseSubjectService = async (
    courseId,
    subjectId,
    requester
) => {
    assertPermission(requester.roles, 'teacher:assignSubject');

    const normalizedCourseId = toPositiveInt(courseId, 'courseId');
    const normalizedSubjectId = toPositiveInt(subjectId, 'subjectId');

    const [course, subject] = await Promise.all([
        assignmentRepository.findCourse(
            requester.institutionId,
            normalizedCourseId
        ),
        assignmentRepository.findSubject(
            requester.institutionId,
            normalizedSubjectId
        ),
    ]);

    if (!course) {
        throw new ServiceError('Curso no encontrado', 404);
    }

    if (!subject) {
        throw new ServiceError('Materia no encontrada', 404);
    }

    return assignmentRepository.listTeachersForCourseSubject(
        requester.institutionId,
        normalizedCourseId,
        normalizedSubjectId
    );
};

export const assignTeacherToSubjectService = async (
    body,
    requester
) => {
    assertPermission(requester.roles, 'teacher:assignSubject');

    const teacherId = toPositiveInt(body.teacherId, 'teacherId');
    const subjectId = toPositiveInt(body.subjectId, 'subjectId');
    const courseId = toPositiveInt(body.courseId, 'courseId');

    const [teacher, subject, course] = await Promise.all([
        assignmentRepository.findTeacher(
            requester.institutionId,
            teacherId
        ),
        assignmentRepository.findSubject(
            requester.institutionId,
            subjectId
        ),
        assignmentRepository.findCourse(
            requester.institutionId,
            courseId
        ),
    ]);

    if (!teacher) {
        throw new ServiceError('Docente no encontrado', 404);
    }

    if (!subject) {
        throw new ServiceError('Materia no encontrada', 404);
    }

    if (!course) {
        throw new ServiceError('Curso no encontrado', 404);
    }

    if (!teacher.user.isActive) {
        throw new ServiceError(
            'No se puede asignar un docente inactivo',
            409
        );
    }

    try {
        return await assignmentRepository.createTeacherSubject(
            teacherId,
            subjectId,
            courseId
        );
    } catch (error) {
        if (error.code === 'P2002') {
            throw new ServiceError(
                'El docente ya está asignado a esta materia y curso',
                409
            );
        }

        throw error;
    }
};

export const removeTeacherSubjectService = async (
    id,
    requester
) => {
    assertPermission(requester.roles, 'teacher:assignSubject');

    const normalizedId = toPositiveInt(id, 'id');

    try {
        await assignmentRepository.deleteTeacherSubject(
            normalizedId
        );
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ServiceError(
                'Asignación docente no encontrada',
                404
            );
        }

        throw error;
    }
};

export const listSchedulesService = async (
    courseId,
    subjectId,
    requester
) => {
    assertPermission(requester.roles, 'schedule:manage');

    const normalizedCourseId = toPositiveInt(courseId, 'courseId');
    const normalizedSubjectId = toPositiveInt(subjectId, 'subjectId');

    const [course, subject] = await Promise.all([
        assignmentRepository.findCourse(
            requester.institutionId,
            normalizedCourseId
        ),
        assignmentRepository.findSubject(
            requester.institutionId,
            normalizedSubjectId
        ),
    ]);

    if (!course) {
        throw new ServiceError('Curso no encontrado', 404);
    }

    if (!subject) {
        throw new ServiceError('Materia no encontrada', 404);
    }

    return assignmentRepository.listSchedules(
        requester.institutionId,
        normalizedCourseId,
        normalizedSubjectId
    );
};

async function validateScheduleData(body, requester, excludeId = null) {
    const courseId = toPositiveInt(body.courseId, 'courseId');
    const subjectId = toPositiveInt(body.subjectId, 'subjectId');

    const { day, shift, startTime, endTime } = body;

    if (!VALID_DAYS.includes(day)) {
        throw new ServiceError('Día de la semana inválido', 400);
    }

    if (!VALID_SHIFTS.includes(shift)) {
        throw new ServiceError('Turno inválido', 400);
    }

    validateTime(startTime, 'startTime');
    validateTime(endTime, 'endTime');
    assertTimeRange(startTime, endTime);

    const [course, subject] = await Promise.all([
        assignmentRepository.findCourse(
            requester.institutionId,
            courseId
        ),
        assignmentRepository.findSubject(
            requester.institutionId,
            subjectId
        ),
    ]);

    if (!course) {
        throw new ServiceError('Curso no encontrado', 404);
    }

    if (!subject) {
        throw new ServiceError('Materia no encontrada', 404);
    }

    const schedules =
        await assignmentRepository.listSchedulesForConflict(
            requester.institutionId,
            courseId,
            day,
            excludeId
        );

    assertNoScheduleConflict(
        schedules,
        startTime,
        endTime
    );

    return {
        courseId,
        subjectId,
        day,
        shift,
        startTime,
        endTime,
    };
}

export const createScheduleService = async (
    body,
    requester
) => {
    assertPermission(requester.roles, 'schedule:manage');

    const data = await validateScheduleData(
        body,
        requester
    );

    return assignmentRepository.createSchedule(data);
};

export const updateScheduleService = async (
    id,
    body,
    requester
) => {
    assertPermission(requester.roles, 'schedule:manage');

    const normalizedId = toPositiveInt(id, 'id');

    const current =
        await assignmentRepository.findSchedule(
            requester.institutionId,
            normalizedId
        );

    if (!current) {
        throw new ServiceError(
            'Horario no encontrado',
            404
        );
    }

    const data = await validateScheduleData(
        {
            ...current,
            ...body,
        },
        requester,
        normalizedId
    );

    try {
        return await assignmentRepository.updateSchedule(
            normalizedId,
            data
        );
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ServiceError(
                'Horario no encontrado',
                404
            );
        }

        throw error;
    }
};

export const deleteScheduleService = async (
    id,
    requester
) => {
    assertPermission(requester.roles, 'schedule:manage');

    const normalizedId = toPositiveInt(id, 'id');

    const schedule =
        await assignmentRepository.findSchedule(
            requester.institutionId,
            normalizedId
        );

    if (!schedule) {
        throw new ServiceError(
            'Horario no encontrado',
            404
        );
    }

    await assignmentRepository.deleteSchedule(
        normalizedId
    );
};