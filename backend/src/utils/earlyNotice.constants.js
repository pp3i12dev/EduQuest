
export const EARLY_NOTICE_TYPE = Object.freeze({
    ABSENCE: 'ABSENCE',
    LATE_ARRIVAL: 'LATE_ARRIVAL',
});

export const EARLY_NOTICE_STATUS = Object.freeze({
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    REJECTED: 'REJECTED',
});

export const EARLY_NOTICE_TYPE_LABELS = Object.freeze({
    ABSENCE: 'Ausencia',
    LATE_ARRIVAL: 'Llegada tarde',
});

export const EARLY_NOTICE_STATUS_LABELS = Object.freeze({
    PENDING: 'A confirmar',
    CONFIRMED: 'Confirmado',
    REJECTED: 'Rechazado / No confirmado',
});

export const EARLY_NOTICE_STATUS_DESCRIPTIONS =
    Object.freeze({
        CONFIRMED:
            'El docente generó o confirmó el aviso.',
        PENDING:
            'Una autoridad generó el aviso y está esperando la confirmación del docente.',
        REJECTED:
            'El docente rechazó el aviso de ausencia o llegada tarde.',
    });

export const EARLY_NOTICE_ROLES = Object.freeze({
    SUPER_ADMIN: 'SUPER_ADMIN',
    DIRECTOR: 'DIRECTOR',
    PRECEPTOR: 'PRECEPTOR',
    TEACHER: 'TEACHER',
    STUDENT: 'STUDENT',
});

export const EARLY_NOTICE_NOTICE_TEXT =
    'Importante: únicamente son válidos los avisos confirmados por el docente responsable.';

export function isValidNoticeType(value) {
    return Object.values(EARLY_NOTICE_TYPE).includes(value);
}

export function isValidNoticeStatus(value) {
    return Object.values(EARLY_NOTICE_STATUS).includes(value);
}

export function canGenerateEarlyNotice(roles = []) {
    return roles.some((role) =>
        [
            EARLY_NOTICE_ROLES.SUPER_ADMIN,
            EARLY_NOTICE_ROLES.DIRECTOR,
            EARLY_NOTICE_ROLES.PRECEPTOR,
            EARLY_NOTICE_ROLES.TEACHER,
        ].includes(role)
    );
}

export function canAdministrativelyRemoveNotice(
    roles = []
) {
    return roles.some((role) =>
        [
            EARLY_NOTICE_ROLES.SUPER_ADMIN,
            EARLY_NOTICE_ROLES.DIRECTOR,
            EARLY_NOTICE_ROLES.PRECEPTOR,
        ].includes(role)
    );
}

export function canConfirmEarlyNotice({
    teacherUserId,
    requesterUserId,
    status,
}) {
    return (
        Number(teacherUserId) === Number(requesterUserId) &&
        status === EARLY_NOTICE_STATUS.PENDING
    );
}

export function canEditEarlyNotice({
    teacherUserId,
    createdById,
    requesterUserId,
    status,
    requesterRoles = [],
}) {
    const isResponsibleTeacher =
        Number(teacherUserId) === Number(requesterUserId);

    if (isResponsibleTeacher) {
        return true;
    }

    if (status !== EARLY_NOTICE_STATUS.PENDING) {
        return false;
    }

    const isCreator =
        Number(createdById) === Number(requesterUserId);

    return (
        isCreator &&
        canAdministrativelyRemoveNotice(requesterRoles)
    );
}

export function getInitialEarlyNoticeStatus({
    teacherUserId,
    requesterUserId,
}) {
    return Number(teacherUserId) === Number(requesterUserId)
        ? EARLY_NOTICE_STATUS.CONFIRMED
        : EARLY_NOTICE_STATUS.PENDING;
}
