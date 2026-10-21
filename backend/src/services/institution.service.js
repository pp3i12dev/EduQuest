
import { canAnyRole } from '../config/permissions.js';
import * as institutionRepository from '../repositories/institution.repository.js';

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function isSuperAdmin(requester) {
    return (
        requester?.isSuperAdmin === true &&
        requester?.roles?.includes('SUPER_ADMIN')
    );
}

function isDirector(requester) {
    return requester?.roles?.includes('DIRECTOR') === true;
}

function assertSuperAdmin(requester) {
    if (!isSuperAdmin(requester)) {
        throw new ServiceError(
            'Esta acción es exclusiva del superadministrador.',
            403
        );
    }
}

function assertDirectorOrSuperAdmin(requester) {
    if (isSuperAdmin(requester)) return;

    if (
        !isDirector(requester) ||
        !canAnyRole(
            requester.roles ?? [],
            'institution:manage'
        )
    ) {
        throw new ServiceError(
            'No tenés permisos para administrar esta institución.',
            403
        );
    }
}

function normalizeId(value) {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new ServiceError(
            'Institución inválida.',
            400
        );
    }

    return id;
}

function normalizeData(body = {}) {
    return {
        nombre:
            typeof body.nombre === 'string'
                ? body.nombre.trim()
                : undefined,
        cue:
            typeof body.cue === 'string'
                ? body.cue.trim()
                : undefined,
        distrito:
            typeof body.distrito === 'string'
                ? body.distrito.trim()
                : undefined,
        provincia:
            typeof body.provincia === 'string'
                ? body.provincia.trim()
                : undefined,
        direccion:
            typeof body.direccion === 'string'
                ? body.direccion.trim() || null
                : null,
        telefono:
            typeof body.telefono === 'string'
                ? body.telefono.trim() || null
                : null,
    };
}

function normalizeUpdateData(body = {}) {
    const data = {};

    const fields = [
        'nombre',
        'distrito',
        'provincia',
        'direccion',
        'telefono',
    ];

    for (const field of fields) {
        if (body[field] === undefined) continue;

        if (typeof body[field] !== 'string') {
            throw new ServiceError(
                `El campo ${field} debe ser texto.`,
                400
            );
        }

        const value = body[field].trim();

        if (
            ['nombre', 'distrito', 'provincia'].includes(field) &&
            !value
        ) {
            throw new ServiceError(
                `El campo ${field} no puede estar vacío.`,
                400
            );
        }

        data[field] =
            ['direccion', 'telefono'].includes(field)
                ? value || null
                : value;
    }

    return data;
}

function handleInstitutionError(error) {
    if (error?.status) throw error;

    if (error?.code === 'P2025') {
        throw new ServiceError(
            'Institución no encontrada.',
            404
        );
    }

    if (error?.code === 'P2002') {
        throw new ServiceError(
            'El CUE ya está registrado.',
            409
        );
    }

    if (error?.code === 'P2003') {
        throw new ServiceError(
            'No se puede eliminar una institución con información asociada. Desactivala en su lugar.',
            409
        );
    }

    throw error;
}

// ----------------------------------------------------
// INSTITUCIÓN PROPIA
// ----------------------------------------------------

export const getMyInstitutionService = async requester => {
    if (!requester) {
        throw new ServiceError(
            'Usuario no autenticado.',
            401
        );
    }

    if (requester.institutionId == null) {
        throw new ServiceError(
            'Tu cuenta no tiene una institución asignada.',
            400
        );
    }

    const institutionId = normalizeId(
        requester.institutionId
    );

    const institution =
        await institutionRepository.findInstitutionById(
            institutionId
        );

    if (!institution) {
        throw new ServiceError(
            'Institución no encontrada.',
            404
        );
    }

    return institution;
};

export const updateMyInstitutionService = async (
    body,
    requester
) => {
    assertDirectorOrSuperAdmin(requester);

    if (requester.institutionId == null) {
        throw new ServiceError(
            'Tu cuenta no tiene una institución asignada.',
            400
        );
    }

    const institutionId = normalizeId(
        requester.institutionId
    );

    const data = normalizeUpdateData(body);

    if (Object.keys(data).length === 0) {
        throw new ServiceError(
            'No se enviaron campos para actualizar.',
            400
        );
    }

    try {
        return await institutionRepository.updateInstitution(
            institutionId,
            data
        );
    } catch (error) {
        handleInstitutionError(error);
    }
};

// ----------------------------------------------------
// ADMINISTRACIÓN GLOBAL
// ----------------------------------------------------

export const listInstitutionsService = async requester => {
    assertSuperAdmin(requester);

    return institutionRepository.listInstitutions();
};

export const getInstitutionService = async (
    id,
    requester
) => {
    const institutionId = normalizeId(id);

    if (!isSuperAdmin(requester)) {
        assertDirectorOrSuperAdmin(requester);

        if (
            institutionId !== Number(requester.institutionId)
        ) {
            throw new ServiceError(
                'No podés acceder a otra institución.',
                403
            );
        }
    }

    const institution =
        await institutionRepository.findInstitutionById(
            institutionId
        );

    if (!institution) {
        throw new ServiceError(
            'Institución no encontrada.',
            404
        );
    }

    return institution;
};

export const createInstitutionService = async (
    body,
    requester
) => {
    assertSuperAdmin(requester);

    const data = normalizeData(body);

    if (!data.nombre) {
        throw new ServiceError(
            'Falta el nombre de la institución.',
            400
        );
    }

    if (!data.cue) {
        throw new ServiceError(
            'Falta el CUE.',
            400
        );
    }

    data.distrito ||= 'La Plata';
    data.provincia ||= 'Buenos Aires';

    try {
        return await institutionRepository.createInstitution(
            data
        );
    } catch (error) {
        handleInstitutionError(error);
    }
};

export const updateInstitutionAdminService = async (
    id,
    body,
    requester
) => {
    assertSuperAdmin(requester);

    const institutionId = normalizeId(id);
    const data = normalizeUpdateData(body);

    if (Object.keys(data).length === 0) {
        throw new ServiceError(
            'No se enviaron campos para actualizar.',
            400
        );
    }

    try {
        return await institutionRepository.updateInstitutionAdmin(
            institutionId,
            data
        );
    } catch (error) {
        handleInstitutionError(error);
    }
};

export const toggleInstitutionStatusService = async (
    id,
    isActive,
    requester
) => {
    assertSuperAdmin(requester);

    const institutionId = normalizeId(id);

    if (typeof isActive !== 'boolean') {
        throw new ServiceError(
            'El estado debe ser verdadero o falso.',
            400
        );
    }

    try {
        return await institutionRepository.setInstitutionActive(
            institutionId,
            isActive
        );
    } catch (error) {
        handleInstitutionError(error);
    }
};

export const deleteInstitutionService = async (
    id,
    requester
) => {
    assertSuperAdmin(requester);

    const institutionId = normalizeId(id);

    try {
        await institutionRepository.deleteInstitution(
            institutionId
        );
    } catch (error) {
        handleInstitutionError(error);
    }
};
