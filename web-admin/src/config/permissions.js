// Espejo liviano de src/config/permissions.js del backend, SOLO para
// decidir qué mostrar en la UI. La seguridad real la hace el backend.
export const FRONTEND_PERMISSIONS = {
    'teacher:manage': ['DIRECTOR', 'PRECEPTOR'],
    'preceptor:manage': ['DIRECTOR'],
    'director:manage': ['DIRECTOR'],
    'student:manage': ['DIRECTOR', 'PRECEPTOR'],
    'student:view': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],
    'invitation:manage': ['DIRECTOR', 'PRECEPTOR', 'TEACHER'],
    'institution:manage': ['DIRECTOR'],
    'course:manage': ['DIRECTOR', 'PRECEPTOR'],
};

export function hasAny(userRoles = [], action) {
    return FRONTEND_PERMISSIONS[action]?.some((r) => userRoles.includes(r)) ?? false;
}