
import {
    ROLES,
    hasAnyRole,
    assertActiveUser,
    assertInstitutionAccess,
    createAccessError,
    createValidationError,
} from './accessControl.js';

import {
    EARLY_NOTICE_STATUS,
} from './earlyNotice.constants.js';

const AUTHORITY_ROLES = [
    ROLES.SUPER_ADMIN,
    ROLES.DIRECTOR,
    ROLES.PRECEPTOR,
];

export function assertCanViewEarlyNotice(
    requester,
    notice
) {
    assertInstitutionAccess(
        requester,
        notice.institutionId
    );

    return true;
}

export function assertCanCreateEarlyNotice(
    requester,
    institutionId
) {
    assertInstitutionAccess(requester, institutionId);

    if (
        !hasAnyRole(requester, [
            ...AUTHORITY_ROLES,
            ROLES.TEACHER,
        ])
    ) {
        throw createAccessError(
            'No tenés permisos para generar avisos tempranos.'
        );
    }

    return true;
}

export function assertCanEditEarlyNotice(
    requester,
    notice
) {
    assertInstitutionAccess(
        requester,
        notice.institutionId
    );

    const isResponsibleTeacher =
        Number(requester.id) ===
        Number(notice.teacherUserId);

    if (
        isResponsibleTeacher &&
        hasAnyRole(requester, [ROLES.TEACHER])
    ) {
        return true;
    }

    if (
        notice.status === EARLY_NOTICE_STATUS.PENDING &&
        Number(notice.createdById) === Number(requester.id) &&
        hasAnyRole(requester, AUTHORITY_ROLES)
    ) {
        return true;
    }

    throw createAccessError(
        'Solo el docente responsable puede modificar un aviso confirmado o rechazado. Las autoridades pueden editar sus avisos mientras estén pendientes.'
    );
}

export function assertCanConfirmEarlyNotice(
    requester,
    notice
) {
    assertInstitutionAccess(
        requester,
        notice.institutionId
    );

    if (
        !hasAnyRole(requester, [ROLES.TEACHER]) ||
        Number(requester.id) !==
        Number(notice.teacherUserId)
    ) {
        throw createAccessError(
            'Solo el docente responsable puede confirmar el aviso.'
        );
    }

    if (notice.status !== EARLY_NOTICE_STATUS.PENDING) {
        throw createValidationError(
            'Solo pueden confirmarse avisos pendientes.'
        );
    }

    if (notice.isActive === false) {
        throw createValidationError(
            'No se puede confirmar un aviso desactivado.'
        );
    }

    return true;
}

export function assertCanRejectEarlyNotice(
    requester,
    notice
) {
    assertInstitutionAccess(
        requester,
        notice.institutionId
    );

    if (
        !hasAnyRole(requester, [ROLES.TEACHER]) ||
        Number(requester.id) !==
        Number(notice.teacherUserId)
    ) {
        throw createAccessError(
            'Solo el docente responsable puede rechazar el aviso.'
        );
    }

    if (notice.status !== EARLY_NOTICE_STATUS.PENDING) {
        throw createValidationError(
            'Solo pueden rechazarse avisos pendientes.'
        );
    }

    if (notice.isActive === false) {
        throw createValidationError(
            'No se puede rechazar un aviso desactivado.'
        );
    }

    return true;
}

export function assertCanDeactivateEarlyNotice(
    requester,
    notice
) {
    assertInstitutionAccess(
        requester,
        notice.institutionId
    );

    if (!hasAnyRole(requester, AUTHORITY_ROLES)) {
        throw createAccessError(
            'No tenés permisos para desactivar avisos.'
        );
    }

    return true;
}

export function assertCanDeleteEarlyNotice(
    requester,
    notice
) {
    assertInstitutionAccess(
        requester,
        notice.institutionId
    );

    if (!hasAnyRole(requester, AUTHORITY_ROLES)) {
        throw createAccessError(
            'No tenés permisos para eliminar avisos.'
        );
    }

    return true;
}

export function getInitialNoticeStatus(
    requester,
    teacherUserId
) {
    assertActiveUser(requester);

    const isResponsibleTeacher =
        Number(requester.id) === Number(teacherUserId) &&
        hasAnyRole(requester, [ROLES.TEACHER]);

    return isResponsibleTeacher
        ? EARLY_NOTICE_STATUS.CONFIRMED
        : EARLY_NOTICE_STATUS.PENDING;
}
