
export const ROLES = Object.freeze({
    SUPER_ADMIN: 'SUPER_ADMIN',
    DIRECTOR: 'DIRECTOR',
    PRECEPTOR: 'PRECEPTOR',
    TEACHER: 'TEACHER',
    STUDENT: 'STUDENT',
});

export function getUserRoles(user) {
    if (!user) return [];

    const roles = new Set(
        Array.isArray(user.roles) ? user.roles : []
    );

    if (user.isSuperAdmin === true) {
        roles.add(ROLES.SUPER_ADMIN);
    }

    if (user.directorProfile) {
        roles.add(ROLES.DIRECTOR);
    }

    if (user.preceptorProfile) {
        roles.add(ROLES.PRECEPTOR);
    }

    if (user.teacherProfile) {
        roles.add(ROLES.TEACHER);
    }

    if (user.studentProfile) {
        roles.add(ROLES.STUDENT);
    }

    return [...roles];
}

export function isSuperAdmin(user) {
    return getUserRoles(user).includes(ROLES.SUPER_ADMIN);
}

export function hasRole(user, role) {
    return getUserRoles(user).includes(role);
}

export function hasAnyRole(user, allowedRoles = []) {
    const roles = getUserRoles(user);

    return allowedRoles.some((role) => roles.includes(role));
}

export function createAccessError(
    message = 'No tenés permisos para realizar esta operación.'
) {
    const error = new Error(message);
    error.status = 403;
    return error;
}

export function createValidationError(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

export function assertAuthenticated(user) {
    if (!user?.id) {
        const error = new Error('Debés iniciar sesión.');
        error.status = 401;
        throw error;
    }
}

export function assertActiveUser(user) {
    assertAuthenticated(user);

    if (user.isActive === false) {
        throw createAccessError('Tu cuenta está desactivada.');
    }
}

export function assertInstitutionAccess(
    requester,
    institutionId
) {
    assertActiveUser(requester);

    if (isSuperAdmin(requester)) {
        return true;
    }

    if (
        institutionId == null ||
        requester.institutionId == null ||
        Number(requester.institutionId) !==
        Number(institutionId)
    ) {
        throw createAccessError(
            'No tenés acceso a esta institución.'
        );
    }

    return true;
}

export function resolveInstitutionId(
    requester,
    requestedInstitutionId = null
) {
    assertActiveUser(requester);

    if (isSuperAdmin(requester)) {
        const institutionId = Number(requestedInstitutionId);

        if (
            !Number.isSafeInteger(institutionId) ||
            institutionId <= 0
        ) {
            throw createValidationError(
                'El SUPER_ADMIN debe seleccionar una institución válida.'
            );
        }

        return institutionId;
    }

    const institutionId = Number(requester.institutionId);

    if (
        !Number.isSafeInteger(institutionId) ||
        institutionId <= 0
    ) {
        throw createAccessError(
            'El usuario no tiene una institución asignada.'
        );
    }

    if (
        requestedInstitutionId != null &&
        Number(requestedInstitutionId) !== institutionId
    ) {
        throw createAccessError(
            'No podés operar sobre otra institución.'
        );
    }

    return institutionId;
}

export function assertRoles(
    requester,
    allowedRoles = []
) {
    assertActiveUser(requester);

    if (!hasAnyRole(requester, allowedRoles)) {
        throw createAccessError();
    }

    return true;
}

export function canManageInstitutions(user) {
    return isSuperAdmin(user);
}

export function canManageAcademicData(user) {
    return hasAnyRole(user, [
        ROLES.SUPER_ADMIN,
        ROLES.DIRECTOR,
        ROLES.PRECEPTOR,
    ]);
}

export function canManageUsers(user) {
    return hasAnyRole(user, [
        ROLES.SUPER_ADMIN,
        ROLES.DIRECTOR,
        ROLES.PRECEPTOR,
    ]);
}
