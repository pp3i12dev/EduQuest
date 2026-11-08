import { randomUUID } from 'node:crypto';

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
        requiredCreateFields: [],
        buildProfileCreate: (body) => ({
            // El legajo oficial no se exige para crear alumnos; se usa una clave interna única.
            legajoStudent: String(body.legajoStudent ?? '').trim() || `ALU-${randomUUID()}`,
        }),
        allowedProfileEdit: ['legajoStudent'],
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
        requiredCreateFields: [],
        buildProfileCreate: (body) => ({
            // Código técnico temporal: el legajo oficial puede informarse más adelante.
            legajoPreceptor: String(body.legajoPreceptor ?? '').trim() || `PRE-${randomUUID()}`,
            shift: body.shift ?? null,
        }),
        allowedProfileEdit: ['legajoPreceptor', 'shift'],
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
        requiredCreateFields: [],
        buildProfileCreate: (body) => ({
            legajoTeacher: String(body.legajoTeacher ?? '').trim() || `DOC-${randomUUID()}`,
            specialty: body.specialty ?? null,
        }),
        allowedProfileEdit: ['legajoTeacher', 'specialty'],
    },
};

export function getRoleConfig(role) {
    return ROLE_CONFIG[role] ?? null;
}