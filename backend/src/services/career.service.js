import { canAnyRole } from '../config/permissions.js';
import * as careerRepository from '../repositories/career.repository.js';
import { getPrisma } from '../config/prisma.js';

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function assertPermission(roles) {
    if (!canAnyRole(roles, 'career:manage')) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }
}

const isSuperAdmin = requester => requester.isSuperAdmin === true || requester.roles?.includes('SUPER_ADMIN');
const scope = requester => isSuperAdmin(requester) ? null : requester.institutionId;

export const listCareersService = requester => {
    assertPermission(requester.roles);
    if (!isSuperAdmin(requester) && !requester.institutionId) throw new ServiceError('Sin institución asignada.', 403);
    return careerRepository.listCareers(scope(requester));
};

export const createCareerService = async (body, requester) => {
    assertPermission(requester.roles);
    const { nombre, level } = body;
    if (!nombre || !level) throw new ServiceError('Faltan campos obligatorios', 400);

    const institutionId = isSuperAdmin(requester) ? Number(body.institutionId) : Number(requester.institutionId);
    if (!Number.isSafeInteger(institutionId) || institutionId < 1) throw new ServiceError('Institución inválida.');
    const exists = await getPrisma().institution.findFirst({ where: { id: institutionId, isActive: true }, select: { id: true } });
    if (!exists) throw new ServiceError('La institución no existe o está inactiva.');
    return careerRepository.createCareer({ nombre, level, institutionId });
};

export const updateCareerService = async (id, body, requester) => {
    assertPermission(requester.roles);
    const { nombre, level } = body;
    const data = {};
    if (nombre) data.nombre = nombre;
    if (level) data.level = level;

    try {
        return await careerRepository.updateCareer(Number(id), scope(requester), data);
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Carrera no encontrada', 404);
        throw error;
    }
};

export const deleteCareerService = async (id, requester) => {
    assertPermission(requester.roles);
    try {
        await careerRepository.deleteCareer(Number(id), scope(requester));
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Carrera no encontrada', 404);
        if (error.code === 'P2003') throw new ServiceError('No se puede eliminar: tiene cursos asociados', 409);
        throw error;
    }
};