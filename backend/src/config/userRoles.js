export const ROLE_CONFIG = {
    student: {
        profileField: 'studentProfile',
        permissions: {
            list: 'student:list',
            create: 'student:create',
            edit: 'student:edit',
            toggle: 'student:deactivate',
            reactivate: 'student:reactivate',
            delete: 'student:delete',
        },
        requiredCreateFields: ['legajoStudent'],
        buildProfileCreate: (body) => ({ legajoStudent: body.legajoStudent }),
        allowedProfileEdit: [],
    },
    director: {
        profileField: 'directorProfile',
        permissions: {
            list: 'director:list',
            create: 'director:create',
            edit: 'director:edit',
            toggle: 'director:deactivate',
            delete: 'director:delete',
        },
        requiredCreateFields: [],
        buildProfileCreate: (body) => ({ position: body.position ?? null }),
        allowedProfileEdit: ['position'],
    },
    preceptor: {
        profileField: 'preceptorProfile',
        permissions: {
            list: 'preceptor:list',
            create: 'preceptor:create',
            edit: 'preceptor:edit',
            toggle: 'preceptor:deactivate',
            delete: 'preceptor:delete',
        },
        requiredCreateFields: ['legajoPreceptor'],
        buildProfileCreate: (body) => ({ legajoPreceptor: body.legajoPreceptor, shift: body.shift ?? null }),
        allowedProfileEdit: ['shift'],
    },
    teacher: {
        profileField: 'teacherProfile',
        permissions: {
            list: 'teacher:list',
            create: 'teacher:create',
            edit: 'teacher:edit',
            toggle: 'teacher:deactivate',
            delete: 'teacher:delete',
        },
        requiredCreateFields: ['legajoTeacher'],
        buildProfileCreate: (body) => ({ legajoTeacher: body.legajoTeacher, specialty: body.specialty ?? null }),
        allowedProfileEdit: ['specialty'],
    },
};

export function getRoleConfig(role) {
    return ROLE_CONFIG[role] ?? null;
}