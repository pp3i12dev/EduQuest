import { canAnyRole } from '../config/permissions.js';
import * as courseRepository from '../repositories/course.repository.js';
import { getPrisma } from '../config/prisma.js';

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

const isSuperAdmin = user => user?.isSuperAdmin === true || user?.roles?.includes('SUPER_ADMIN');
const asPositiveId = (value, field) => {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) throw new ServiceError(`${field} inválido`, 400);
    return id;
};
const scopeId = requester => isSuperAdmin(requester) ? null : asPositiveId(requester.institutionId, 'Institución del usuario');
const selectInstitution = (body, requester) => isSuperAdmin(requester)
    ? asPositiveId(body.institutionId, 'Institución')
    : scopeId(requester);
const validateCareer = async (careerId, institutionId) => {
    if (careerId == null) return;
    const career = await getPrisma().career.findFirst({ where: { id: careerId, institutionId }, select: { id: true } });
    if (!career) throw new ServiceError('La carrera seleccionada no pertenece a la institución.', 400);
};

export const listCoursesService = requester => {
    assertPermission(requester.roles);
    return courseRepository.listCourses(scopeId(requester));
};

export const createCourseService = async (body, requester) => {
    assertPermission(requester.roles);
    const nombre = String(body.nombre ?? '').trim();
    if (!nombre) throw new ServiceError('Falta el nombre del curso', 400);
    const institutionId = selectInstitution(body, requester);
    const institution = await getPrisma().institution.findFirst({ where: { id: institutionId, isActive: true }, select: { id: true } });
    if (!institution) throw new ServiceError('Institución inexistente o inactiva.', 400);
    const careerId = body.careerId ? asPositiveId(body.careerId, 'Carrera') : null;
    await validateCareer(careerId, institutionId);
    const academicYear = body.academicYear != null && body.academicYear !== '' ? Number(body.academicYear) : undefined;
    if (academicYear !== undefined && (!Number.isInteger(academicYear) || academicYear < 2000 || academicYear > 2100)) throw new ServiceError('Año académico inválido', 400);
    return courseRepository.createCourse({ nombre, academicYear, careerId, institutionId });
};

export const updateCourseService = async (id, body, requester) => {
    assertPermission(requester.roles);
    const courseId = asPositiveId(id, 'Curso');
    const current = await getPrisma().course.findFirst({ where: { id: courseId, ...(scopeId(requester) == null ? {} : { institutionId: scopeId(requester) }) } });
    if (!current) throw new ServiceError('Curso no encontrado', 404);
    if (body.institutionId != null && Number(body.institutionId) !== current.institutionId) throw new ServiceError('No se puede trasladar el curso a otra institución.', 400);
    const data = {};
    if (body.nombre !== undefined) {
        const nombre = String(body.nombre).trim();
        if (!nombre) throw new ServiceError('Ingresá el nombre del curso');
        data.nombre = nombre;
    }
    if (body.academicYear !== undefined) {
        const year = Number(body.academicYear);
        if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new ServiceError('Año académico inválido');
        data.academicYear = year;
    }
    if (body.careerId !== undefined) {
        data.careerId = body.careerId ? asPositiveId(body.careerId, 'Carrera') : null;
        await validateCareer(data.careerId, current.institutionId);
    }
    try {
        return await courseRepository.updateCourse(courseId, current.institutionId, data);
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Curso no encontrado', 404);
        throw error;
    }
};

export const deleteCourseService = async (id, requester) => {
    assertPermission(requester.roles);
    try {
        await courseRepository.deleteCourse(Number(id), scopeId(requester));
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Curso no encontrado', 404);
        if (error.code === 'P2003') throw new ServiceError('No se puede eliminar: tiene alumnos o docentes asociados', 409);
        throw error;
    }
};