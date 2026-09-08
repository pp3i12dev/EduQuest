export const PERMISSIONS = {
    'institution:manage': ['DIRECTOR'],
    'course:manage': ['DIRECTOR', 'PRECEPTOR'],
    'subject:manage': ['DIRECTOR', 'PRECEPTOR'],
    'teacher:assignSubject': ['DIRECTOR', 'PRECEPTOR'],

    'director:list': ['DIRECTOR'],
    'director:create': ['DIRECTOR'],
    'director:edit': ['DIRECTOR'],
    'director:deactivate': ['DIRECTOR'],
    'director:delete': ['DIRECTOR'],

    'preceptor:list': ['DIRECTOR'],
    'preceptor:create': ['DIRECTOR'],
    'preceptor:edit': ['DIRECTOR'],
    'preceptor:deactivate': ['DIRECTOR'],
    'preceptor:delete': ['DIRECTOR'],

    'teacher:list': ['DIRECTOR', 'PRECEPTOR'],
    'teacher:create': ['DIRECTOR', 'PRECEPTOR'],
    'teacher:edit': ['DIRECTOR', 'PRECEPTOR'],
    'teacher:deactivate': ['DIRECTOR', 'PRECEPTOR'],
    'teacher:delete': ['DIRECTOR', 'PRECEPTOR'],

    'student:list': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'], 
    'student:create': ['DIRECTOR', 'PRECEPTOR'],
    'student:edit': ['DIRECTOR', 'PRECEPTOR'],
    'student:enroll': ['DIRECTOR', 'PRECEPTOR'],
    'student:deactivate': ['DIRECTOR', 'PRECEPTOR'],
    'student:reactivate': ['DIRECTOR', 'PRECEPTOR'],
    'student:delete': ['DIRECTOR', 'PRECEPTOR'],

    'grade:manage': ['TEACHER'],
    'evaluation:manage': ['TEACHER'],
    'tracking:manage': ['TEACHER'],
    'attendance:take': ['PRECEPTOR', 'TEACHER'],

    'selfSignup:approve': ['DIRECTOR', 'PRECEPTOR'],

    // Invitaciones: quién puede invitar a cada rol destino
    'invitation:sendToDirector': ['DIRECTOR'],
    'invitation:sendToPreceptor': ['DIRECTOR'],
    'invitation:sendToTeacher': ['DIRECTOR', 'PRECEPTOR'],
    'invitation:sendToStudent': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],
    'invitation:list': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'], // docente solo ve las suyas, filtrado en el controller
    'invitation:cancel': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'], // ídem, con chequeo de ownership

    'game:play': ['STUDENT'],
    'stats:viewSelf': ['STUDENT'],

    'profile:editSelf': ['DIRECTOR', 'PRECEPTOR', 'TEACHER', 'STUDENT'],
};

// Mapea cada rol destino de invitación a la acción de permiso correspondiente
export const INVITATION_TARGET_PERMISSION = {
    DIRECTOR: 'invitation:sendToDirector',
    PRECEPTOR: 'invitation:sendToPreceptor',
    TEACHER: 'invitation:sendToTeacher',
    STUDENT: 'invitation:sendToStudent',
};

export function canRole(role, action) {
    return PERMISSIONS[action]?.includes(role) ?? false;
}

export function canAnyRole(roles, action) {
    return roles.some((role) => canRole(role, action));
}