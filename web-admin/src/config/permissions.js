export const FRONTEND_PERMISSIONS = {
    'teacher:manage': ['DIRECTOR', 'PRECEPTOR'],
    'preceptor:manage': ['DIRECTOR'],
    'director:manage': ['DIRECTOR'],
    'student:manage': ['DIRECTOR', 'PRECEPTOR'],
    'student:view': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],
    'invitation:manage': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],
    'institution:manage': ['DIRECTOR'],
    'career:manage': ['DIRECTOR', 'PRECEPTOR'],
    'course:manage': ['DIRECTOR', 'PRECEPTOR'],
    'subject:manage': ['DIRECTOR', 'PRECEPTOR'],
};

export function hasAny(userRoles = [], action) {
    return FRONTEND_PERMISSIONS[action]?.some((r) => userRoles.includes(r)) ?? false;
}