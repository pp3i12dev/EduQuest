import { canAnyRole } from '../config/permissions.js';
import * as institutionRepository from '../repositories/institution.repository.js';

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

export const getMyInstitutionService = async (requester) => {
    const institution = await institutionRepository.findInstitutionById(requester.institutionId);
    if (!institution) throw new ServiceError('Institución no encontrada', 404);
    return institution;
};

export const updateMyInstitutionService = async (body, requester) => {
    if (!canAnyRole(requester.roles, 'institution:manage')) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }

    const { nombre, distrito, provincia, direccion, telefono } = body;
    const data = {};
    if (nombre) data.nombre = nombre;
    if (distrito) data.distrito = distrito;
    if (provincia) data.provincia = provincia;
    if (direccion !== undefined) data.direccion = direccion;
    if (telefono !== undefined) data.telefono = telefono;

    return institutionRepository.updateInstitution(requester.institutionId, data);
};