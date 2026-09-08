import { canAnyRole } from '../config/permissions.js';
import * as careerRepository from '../repositories/career.repository.js';

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

export const listCareersService = (requester) => {
    assertPermission(requester.roles);
    return careerRepository.listCareers(requester.institutionId);
};

export const createCareerService = async (body, requester) => {
    assertPermission(requester.roles);
    const { nombre, level } = body;
    if (!nombre || !level) throw new ServiceError('Faltan campos obligatorios', 400);

    return careerRepository.createCareer({ nombre, level, institutionId: requester.institutionId });
};

export const updateCareerService = async (id, body, requester) => {
    assertPermission(requester.roles);
    const { nombre, level } = body;
    const data = {};
    if (nombre) data.nombre = nombre;
    if (level) data.level = level;

    try {
        return await careerRepository.updateCareer(Number(id), requester.institutionId, data);
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Carrera no encontrada', 404);
        throw error;
    }
};

export const deleteCareerService = async (id, requester) => {
    assertPermission(requester.roles);
    try {
        await careerRepository.deleteCareer(Number(id), requester.institutionId);
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Carrera no encontrada', 404);
        if (error.code === 'P2003') throw new ServiceError('No se puede eliminar: tiene cursos asociados', 409);
        throw error;
    }
};