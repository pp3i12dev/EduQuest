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
// Turno de pertenencia del curso. No se confunde con la modalidad de cada clase.
const SHIFTS = new Set(['MANANA', 'TARDE', 'NOCHE']);
const shiftOf = value => {
    const shift = String(value ?? '').toUpperCase();
    if (!SHIFTS.has(shift)) throw new ServiceError('Seleccioná un turno válido: mañana, tarde o noche.', 400);
    return shift;
};
const assertUniqueCourse = async ({ nombre, careerId, institutionId, academicYear, shift }, excludeId = null) => {
    if (!shift) return; // Los cursos históricos sin turno podrán regularizarse sin pérdida de datos.
    const conflict = await getPrisma().course.findFirst({
        where: {
            institutionId, careerId, nombre: { equals: nombre, mode: 'insensitive' },
            academicYear, shift, ...(excludeId ? { id: { not: excludeId } } : {}),
        }, select: { id: true },
    });
    if (conflict) throw new ServiceError('Ya existe ese curso en la carrera, año lectivo y turno elegidos.', 409);
};

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
    const shift = shiftOf(body.shift);
    const year = academicYear ?? 2026;
    await assertUniqueCourse({ nombre, academicYear: year, careerId, institutionId, shift });
    try {
        return await courseRepository.createCourse({ nombre, academicYear, careerId, institutionId, shift });
    } catch (error) {
        if (error.code === 'P2002' || error.code === '23505') throw new ServiceError('Ya existe ese curso con esa carrera, año y turno.', 409);
        throw error;
    }
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
    if (body.shift !== undefined) {
        data.shift = shiftOf(body.shift);
        // No reasignar de turno un curso ya utilizado: trasladaría también
        // matrículas, resultados y destinatarios de avisos. Se permite completar
        // cursos heredados que no tienen turno definido.
        if (current.shift && current.shift !== data.shift) {
            const prisma = getPrisma();
            const [students, teachers, schedules, notices, communications] = await Promise.all([
                prisma.studentCourse.count({ where: { courseId } }),
                prisma.teacherSubject.count({ where: { courseId } }),
                prisma.subjectSchedule.count({ where: { courseId } }),
                prisma.earlyNotice.count({ where: { courseId } }),
                prisma.institutionEventCourse.count({ where: { courseId } }),
            ]);
            if (students || teachers || schedules || notices || communications) {
                throw new ServiceError('Este curso tiene matrículas, docentes, horarios o avisos vinculados. Para abrir otro turno, creá un curso nuevo sin trasladar el existente.', 409);
            }
        }
    }
    await assertUniqueCourse({
        nombre: data.nombre ?? current.nombre,
        careerId: data.careerId === undefined ? current.careerId : data.careerId,
        institutionId: current.institutionId,
        academicYear: data.academicYear ?? current.academicYear,
        shift: data.shift === undefined ? current.shift : data.shift,
    }, courseId);
    // No se reemplaza el registro Course: matrículas, actividades y avisos conservan su courseId.
    try {
        return await courseRepository.updateCourse(courseId, current.institutionId, data);
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Curso no encontrado', 404);
        if (error.code === 'P2002' || error.code === '23505') throw new ServiceError('Ya existe ese curso con esa carrera, año y turno.', 409);
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