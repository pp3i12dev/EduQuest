
export const PERMISSIONS = {
    'user:manageRoles': ['DIRECTOR', 'PRECEPTOR'],

    'institution:manage': ['DIRECTOR'],

    'course:manage': ['DIRECTOR', 'PRECEPTOR'],
    'career:manage': ['DIRECTOR', 'PRECEPTOR'],
    'subject:manage': ['DIRECTOR', 'PRECEPTOR'],

    'teacher:assignSubject': ['DIRECTOR', 'PRECEPTOR'],
    'student:enroll': ['DIRECTOR', 'PRECEPTOR'],
    'schedule:manage': ['DIRECTOR', 'PRECEPTOR'],

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
    'subjectContent:manage': ['TEACHER', 'PRECEPTOR', 'DIRECTOR'],
    'evaluation:manage': ['TEACHER'],
    'tracking:manage': ['TEACHER'],
    'activity:manage': ['TEACHER'],
    'attendance:take': ['PRECEPTOR', 'TEACHER'],

    'selfSignup:approve': ['DIRECTOR', 'PRECEPTOR'],

    'invitation:sendToDirector': ['DIRECTOR'],
    'invitation:sendToPreceptor': ['DIRECTOR'],
    'invitation:sendToTeacher': ['DIRECTOR', 'PRECEPTOR'],
    'invitation:sendToStudent': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],
    'invitation:list': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],
    'invitation:cancel': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],

    'game:play': ['STUDENT'],
    'stats:viewSelf': ['STUDENT'],
    'profile:editSelf': [
        'DIRECTOR',
        'PRECEPTOR',
        'TEACHER',
        'STUDENT',
    ],
};

export const INVITATION_TARGET_PERMISSION = {
    DIRECTOR: 'invitation:sendToDirector',
    PRECEPTOR: 'invitation:sendToPreceptor',
    TEACHER: 'invitation:sendToTeacher',
    STUDENT: 'invitation:sendToStudent',
};

export function canRole(role, action) {
    if (!Object.prototype.hasOwnProperty.call(PERMISSIONS, action)) {
        return false;
    }

    if (role === 'SUPER_ADMIN') {
        return true;
    }

    return PERMISSIONS[action].includes(role);
}

export function canAnyRole(roles = [], action) {
    if (!Array.isArray(roles)) {
        return false;
    }

    return roles.some(role => canRole(role, action));
}
