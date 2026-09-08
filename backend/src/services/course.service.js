import { canAnyRole } from '../config/permissions.js';
import * as courseRepository from '../repositories/course.repository.js';

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function assertPermission(roles) {
    if (!canAnyRole(roles, 'course:manage')) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }
}

export const listCoursesService = (requester) => {
    assertPermission(requester.roles);
    return courseRepository.listCourses(requester.institutionId);
};

export const createCourseService = async (body, requester) => {
    assertPermission(requester.roles);
    const { nombre, academicYear, careerId } = body;
    if (!nombre) throw new ServiceError('Falta el nombre del curso', 400);

    return courseRepository.createCourse({
        nombre,
        academicYear: academicYear ? Number(academicYear) : undefined,
        careerId: careerId ? Number(careerId) : null,
        institutionId: requester.institutionId,
    });
};

export const updateCourseService = async (id, body, requester) => {
    assertPermission(requester.roles);
    const { nombre, academicYear, careerId } = body;
    const data = {};
    if (nombre) data.nombre = nombre;
    if (academicYear) data.academicYear = Number(academicYear);
    if (careerId !== undefined) data.careerId = careerId ? Number(careerId) : null;

    try {
        return await courseRepository.updateCourse(Number(id), requester.institutionId, data);
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Curso no encontrado', 404);
        throw error;
    }
};

export const deleteCourseService = async (id, requester) => {
    assertPermission(requester.roles);
    try {
        await courseRepository.deleteCourse(Number(id), requester.institutionId);
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Curso no encontrado', 404);
        if (error.code === 'P2003') throw new ServiceError('No se puede eliminar: tiene alumnos o docentes asociados', 409);
        throw error;
    }
};