
export const FRONTEND_PERMISSIONS = {
    'teacher:manage': ['DIRECTOR', 'PRECEPTOR'],
    'preceptor:manage': ['DIRECTOR'],
    'director:manage': ['DIRECTOR'],

    'student:manage': ['DIRECTOR', 'PRECEPTOR'],
    'student:view': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],

    'student:enroll': ['DIRECTOR', 'PRECEPTOR'],
    'teacher:assignSubject': ['DIRECTOR', 'PRECEPTOR'],
    'schedule:manage': ['DIRECTOR', 'PRECEPTOR'],

    'invitation:manage': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],

    'institution:manage': ['DIRECTOR'],
    'career:manage': ['DIRECTOR', 'PRECEPTOR'],
    'course:manage': ['DIRECTOR', 'PRECEPTOR'],
    'subject:manage': ['DIRECTOR', 'PRECEPTOR'],
    'subjectContent:manage': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],
};

export function hasAny(userRoles = [], action) {
    if (!Array.isArray(userRoles)) {
        return false;
    }

    // Evitamos autorizar acciones desconocidas.
    if (!Object.prototype.hasOwnProperty.call(
        FRONTEND_PERMISSIONS,
        action
    )) {
        return false;
    }

    // El superadministrador tiene acceso a las
    // funcionalidades administrativas registradas.
    if (userRoles.includes('SUPER_ADMIN')) {
        return true;
    }

    return FRONTEND_PERMISSIONS[action].some(
        role => userRoles.includes(role)
    );
}
