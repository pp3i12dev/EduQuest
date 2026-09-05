// Cada acción lista los roles que la tienen permitida.
// "student:list:own" (docente) se resuelve en el controller filtrando por sus cursos, no acá.
export const PERMISSIONS = {
    'course:manage': ['DIRECTOR'],
    'subject:manage': ['DIRECTOR'],
    'teacher:assignSubject': ['DIRECTOR'],

    'staff:invite': ['DIRECTOR'],
    'staff:edit': ['DIRECTOR'],
    'staff:deactivate': ['DIRECTOR'],
    'staff:delete': ['DIRECTOR'],

    'student:create': ['DIRECTOR', 'PRECEPTOR'],
    'student:edit': ['DIRECTOR', 'PRECEPTOR'],
    'student:enroll': ['DIRECTOR', 'PRECEPTOR'],
    'student:deactivate': ['DIRECTOR', 'PRECEPTOR'],
    'student:reactivate': ['DIRECTOR', 'PRECEPTOR'],
    'student:delete': ['DIRECTOR'], // hard delete, solo directivo
    'student:list': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'], // docente se filtra en el controller

    'grade:create': ['TEACHER'],
    'attendance:take': ['PRECEPTOR', 'TEACHER'],

    'selfSignup:approve': ['DIRECTOR', 'PRECEPTOR'],
};

export function canRole(role, action) {
    return PERMISSIONS[action]?.includes(role) ?? false;
}

export function canAnyRole(roles, action) {
    return roles.some((role) => canRole(role, action));
}