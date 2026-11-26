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

// El superadministrador puede abrir cursos de cualquier institución.
// Para directores/preceptores se conserva siempre el alcance de su sesión.
function institutionScope(requester) {
    if (requester.isSuperAdmin === true || requester.roles?.includes('SUPER_ADMIN')) {
        return null;
    }
    const institutionId = Number(requester.institutionId);
    if (!Number.isSafeInteger(institutionId) || institutionId <= 0) {
        throw new ServiceError('Tu cuenta no tiene una institución válida', 403);
    }
    return institutionId;
}

async function findAuthorizedCourse(courseId, requester) {
    const course = await assignmentRepository.findCourse(institutionScope(requester), courseId);
    if (!course) throw new ServiceError('Curso no encontrado o no autorizado', 404);
    return course;
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

const VALID_MODALITIES = ['PRESENCIAL', 'VIRTUAL_SINCRONA', 'VIRTUAL_ASINCRONA'];

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

function assertNoScheduleConflict(schedules, startTime, endTime, modality) {
    // Una clase asincrónica no ocupa una franja de aula o videollamada.
    if (modality === 'VIRTUAL_ASINCRONA') return;
    const conflict = schedules.some(
        (schedule) =>
            schedule.modality !== 'VIRTUAL_ASINCRONA' &&
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
        institutionScope(requester)
    );
};

export const listStudentsForCourseService = async (
    courseId,
    requester
) => {
    assertPermission(requester.roles, 'student:enroll');
    const id = toPositiveInt(courseId, 'courseId');
    const course = await findAuthorizedCourse(id, requester);

    // No usar institutionId=null al consultar los alumnos: el curso
    // determina la institución real incluso para SUPER_ADMIN.
    return assignmentRepository.listStudentsForCourse(course.institutionId, id);
};

export const assignStudentToCourseService = async (body, requester) => {
    assertPermission(requester.roles, 'student:enroll');
    const studentId = toPositiveInt(body.studentId, 'studentId');
    const courseId = toPositiveInt(body.courseId, 'courseId');
    const course = await findAuthorizedCourse(courseId, requester);
    const student = await assignmentRepository.findStudent(course.institutionId, studentId);

    if (!student) throw new ServiceError('Alumno no encontrado en la institución de este curso', 404);
    if (!student.user.isActive) {
        throw new ServiceError('No se puede asignar un alumno inactivo', 409);
    }

    try {
        return await assignmentRepository.createStudentCourse(studentId, courseId);
    } catch (error) {
        if (error.code === 'STUDENT_ALREADY_ENROLLED') {
            throw new ServiceError(error.message, 409);
        }
        if (error.code === 'P2002') {
            throw new ServiceError('El alumno ya tiene un curso asignado. Quitá la matrícula anterior para cambiarlo.', 409);
        }
        throw error;
    }
};

export const removeStudentFromCourseService = async (studentId, courseId, requester) => {
    assertPermission(requester.roles, 'student:enroll');
    const normalizedStudentId = toPositiveInt(studentId, 'studentId');
    const normalizedCourseId = toPositiveInt(courseId, 'courseId');
    const course = await findAuthorizedCourse(normalizedCourseId, requester);
    const student = await assignmentRepository.findStudent(course.institutionId, normalizedStudentId);
    if (!student) throw new ServiceError('Alumno no encontrado en la institución de este curso', 404);
    await assignmentRepository.deleteStudentCourse(normalizedStudentId, normalizedCourseId);
};

export const listTeachersForCourseSubjectService = async (courseId, subjectId, requester) => {
    assertPermission(requester.roles, 'teacher:assignSubject');
    const id = toPositiveInt(courseId, 'courseId');
    const sid = toPositiveInt(subjectId, 'subjectId');
    const course = await findAuthorizedCourse(id, requester);
    const subject = await assignmentRepository.findSubject(course.institutionId, sid);
    if (!subject) throw new ServiceError('Materia no encontrada en la institución del curso', 404);
    return assignmentRepository.listTeachersForCourseSubject(course.institutionId, id, sid);
};

export const assignTeacherToSubjectService = async (body, requester) => {
    assertPermission(requester.roles, 'teacher:assignSubject');
    const teacherId = toPositiveInt(body.teacherId, 'teacherId');
    const subjectId = toPositiveInt(body.subjectId, 'subjectId');
    const courseId = toPositiveInt(body.courseId, 'courseId');
    const course = await findAuthorizedCourse(courseId, requester);
    const [teacher, subject] = await Promise.all([
        assignmentRepository.findTeacher(course.institutionId, teacherId),
        assignmentRepository.findSubject(course.institutionId, subjectId),
    ]);
    if (!teacher) throw new ServiceError('Docente no encontrado en la institución del curso', 404);
    if (!subject) throw new ServiceError('Materia no encontrada en la institución del curso', 404);
    if (!teacher.user.isActive) {
        throw new ServiceError('No se puede asignar un docente inactivo', 409);
    }
    try {
        return await assignmentRepository.createTeacherSubject(teacherId, subjectId, courseId);
    } catch (error) {
        if (error.code === 'SUBJECT_ALREADY_HAS_TEACHER') {
            throw new ServiceError(error.message, 409);
        }
        if (error.code === 'P2002') {
            throw new ServiceError('La materia ya tiene un docente responsable en ese curso.', 409);
        }
        throw error;
    }
};

export const removeTeacherSubjectService = async (id, requester) => {
    assertPermission(requester.roles, 'teacher:assignSubject');
    const normalizedId = toPositiveInt(id, 'id');
    const assignment = await assignmentRepository.findTeacherSubjectAssignment(normalizedId);
    const scope = institutionScope(requester);
    if (!assignment ||
        (scope !== null && assignment.course.institutionId !== scope) ||
        assignment.subject.institutionId !== assignment.course.institutionId
    ) {
        throw new ServiceError('Asignación docente no encontrada o no autorizada', 404);
    }
    try {
        await assignmentRepository.deleteTeacherSubject(normalizedId);
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Asignación docente no encontrada', 404);
        throw error;
    }
};

export const listSchedulesService = async (courseId, subjectId, requester) => {
    assertPermission(requester.roles, 'schedule:manage');
    const id = toPositiveInt(courseId, 'courseId');
    const sid = toPositiveInt(subjectId, 'subjectId');
    const course = await findAuthorizedCourse(id, requester);
    const subject = await assignmentRepository.findSubject(course.institutionId, sid);
    if (!subject) throw new ServiceError('Materia no encontrada en la institución del curso', 404);
    return assignmentRepository.listSchedules(course.institutionId, id, sid);
};

async function validateScheduleData(body, requester, excludeId = null) {
    const courseId = toPositiveInt(body.courseId, 'courseId');
    const subjectId = toPositiveInt(body.subjectId, 'subjectId');

    const { day, shift, startTime, endTime } = body;
    const modality = body.modality ?? 'PRESENCIAL';

    if (!VALID_DAYS.includes(day)) {
        throw new ServiceError('Día de la semana inválido', 400);
    }

    if (!VALID_SHIFTS.includes(shift)) {
        throw new ServiceError('Turno inválido', 400);
    }
    if (!VALID_MODALITIES.includes(modality)) {
        throw new ServiceError('Modalidad de cursada inválida', 400);
    }

    validateTime(startTime, 'startTime');
    validateTime(endTime, 'endTime');
    assertTimeRange(startTime, endTime);

    const course = await findAuthorizedCourse(courseId, requester);
    const subject = await assignmentRepository.findSubject(course.institutionId, subjectId);
    if (!subject) throw new ServiceError('Materia no encontrada en la institución del curso', 404);

    const schedules = await assignmentRepository.listSchedulesForConflict(
        course.institutionId, courseId, day, excludeId
    );

    assertNoScheduleConflict(
        schedules,
        startTime,
        endTime,
        modality
    );

    return {
        courseId,
        subjectId,
        day,
        shift,
        modality,
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
            institutionScope(requester),
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
            institutionScope(requester),
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