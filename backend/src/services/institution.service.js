import { canAnyRole } from '../config/permissions.js';
import * as institutionRepository from '../repositories/institution.repository.js';

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function assertManagePermission(requester) {
    if (
        !canAnyRole(
            requester.roles,
            'institution:manage'
        )
    ) {
        throw new ServiceError(
            'No tenés permisos para esta acción',
            403
        );
    }
}

function normalizeData(body) {
    return {
        nombre: body.nombre?.trim(),
        cue: body.cue?.trim(),
        distrito: body.distrito?.trim() || 'La Plata',
        provincia:
            body.provincia?.trim() || 'Buenos Aires',
        direccion:
            body.direccion?.trim() || null,
        telefono:
            body.telefono?.trim() || null,
    };
}

export const getMyInstitutionService = async (
    requester
) => {
    const institution =
        await institutionRepository.findInstitutionById(
            requester.institutionId
        );

    if (!institution) {
        throw new ServiceError(
            'Institución no encontrada',
            404
        );
    }

    return institution;
};

export const updateMyInstitutionService = async (
    body,
    requester
) => {
    if (
        !canAnyRole(
            requester.roles,
            'institution:manage'
        )
    ) {
        throw new ServiceError(
            'No tenés permisos para esta acción',
            403
        );
    }

    const data = normalizeData(body);
    delete data.cue;

    if (!data.nombre) {
        throw new ServiceError(
            'Falta el nombre de la institución',
            400
        );
    }

    return institutionRepository.updateInstitution(
        requester.institutionId,
        data
    );
};

export const listInstitutionsService = async (
    requester
) => {
    assertManagePermission(requester);

    return institutionRepository.listInstitutions();
};

export const getInstitutionService = async (
    id,
    requester
) => {
    assertManagePermission(requester);

    const institution =
        await institutionRepository.findInstitutionById(
            Number(id)
        );

    if (!institution) {
        throw new ServiceError(
            'Institución no encontrada',
            404
        );
    }

    return institution;
};

export const createInstitutionService = async (
    body,
    requester
) => {
    assertManagePermission(requester);

    const data = normalizeData(body);

    if (!data.nombre) {
        throw new ServiceError(
            'Falta el nombre de la institución',
            400
        );
    }

    if (!data.cue) {
        throw new ServiceError(
            'Falta el CUE',
            400
        );
    }

    try {
        return await institutionRepository.createInstitution(
            data
        );
    } catch (error) {
        if (error.code === 'P2002') {
            throw new ServiceError(
                'El CUE ya está registrado',
                409
            );
        }

        throw error;
    }
};

export const updateInstitutionAdminService = async (
    id,
    body,
    requester
) => {
    assertManagePermission(requester);

    const normalizedId = Number(id);

    if (
        !Number.isInteger(normalizedId) ||
        normalizedId <= 0
    ) {
        throw new ServiceError(
            'Institución inválida',
            400
        );
    }

    const data = normalizeData(body);

    delete data.cue;

    if (!data.nombre) {
        throw new ServiceError(
            'Falta el nombre de la institución',
            400
        );
    }

    try {
        return await institutionRepository.updateInstitutionAdmin(
            normalizedId,
            data
        );
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ServiceError(
                'Institución no encontrada',
                404
            );
        }

        throw error;
    }
};

export const toggleInstitutionStatusService = async (
    id,
    isActive,
    requester
) => {
    assertManagePermission(requester);

    const normalizedId = Number(id);

    if (
        !Number.isInteger(normalizedId) ||
        normalizedId <= 0
    ) {
        throw new ServiceError(
            'Institución inválida',
            400
        );
    }

    try {
        return await institutionRepository.setInstitutionActive(
            normalizedId,
            Boolean(isActive)
        );
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ServiceError(
                'Institución no encontrada',
                404
            );
        }

        throw error;
    }
};

export const deleteInstitutionService = async (
    id,
    requester
) => {
    assertManagePermission(requester);

    const normalizedId = Number(id);

    if (
        !Number.isInteger(normalizedId) ||
        normalizedId <= 0
    ) {
        throw new ServiceError(
            'Institución inválida',
            400
        );
    }

    try {
        await institutionRepository.deleteInstitution(
            normalizedId
        );
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ServiceError(
                'Institución no encontrada',
                404
            );
        }

        if (error.code === 'P2003') {
            throw new ServiceError(
                'No se puede eliminar una institución que tiene usuarios, cursos, carreras o materias asociadas. Primero desactivalá.',
                409
            );
        }

        throw error;
    }
};