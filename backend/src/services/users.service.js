import { hashPassword } from '../utils/password.js';
import { canAnyRole } from '../config/permissions.js';

import * as userRepository from '../repositories/user.repository.js';
import { ROLE_CONFIG, getRoleConfig } from '../config/userRoles.js';
import { getRolesFromUser } from '../utils/rols.js';

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function assertRoleConfig(role) {
    const config = getRoleConfig(role);
    if (!config) throw new ServiceError('Rol inválido', 400);
    return config;
}

function assertPermission(requesterRoles, permissionKey) {
    if (!permissionKey || !canAnyRole(requesterRoles, permissionKey)) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }
}

function serializeUser(user, profileField) {
    return {
        id: user.id,
        dni: user.dni,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        createdAt: user.createdAt,
        profile: user[profileField] ?? null,
    };
}

export const listUsersService = async (role, requester) => {
    const config = assertRoleConfig(role);
    assertPermission(requester.roles, config.permissions.list);

    const users = await userRepository.listUsersByProfile({
        institutionId: requester.institutionId,
        profileField: config.profileField,
    });

    return users.map((u) => serializeUser(u, config.profileField));
};

export const createUserService = async (role, body, requester) => {
    const config = assertRoleConfig(role);
    if (!config.permissions.create) {
        throw new ServiceError('Este rol se crea mediante invitación, no directamente', 400);
    }
    assertPermission(requester.roles, config.permissions.create);

    const { dni, email, password, firstName, lastName, ...rest } = body;
    if (!dni || !email || !password || !firstName || !lastName) {
        throw new ServiceError('Faltan campos obligatorios', 400);
    }
    for (const field of config.requiredCreateFields ?? []) {
        if (!rest[field]) throw new ServiceError(`Falta el campo "${field}"`, 400);
    }

    const passwordHash = await hashPassword(password);

    try {
        const user = await userRepository.createUserWithProfile({
            userData: { dni, email, passwordHash, firstName, lastName, institutionId: requester.institutionId },
            profileField: config.profileField,
            profileData: config.buildProfileCreate(rest),
        });

        if (role === 'student' && rest.courseId !== undefined) {
            if (!canAnyRole(requester.roles, 'student:enroll')) {
                throw new ServiceError('No tenés permisos para matricular alumnos', 403);
            }
            await userRepository.assignStudentCourse({
                studentProfileId: user.studentProfile.id,
                courseId: rest.courseId ? Number(rest.courseId) : null,
            });
        }

        return serializeUser(user, config.profileField);
    } catch (error) {
        if (error.code === 'P2002') throw new ServiceError('El email, DNI o legajo ya está en uso', 409);
        throw error;
    }
};

export const updateUserService = async (role, id, body, requester) => {
    const config = assertRoleConfig(role);
    assertPermission(requester.roles, config.permissions.edit);

    const { dni, email, firstName, lastName, password, ...rest } = body;

    const userData = {};
    if (dni) userData.dni = dni;
    if (email) userData.email = email;
    if (firstName) userData.firstName = firstName;
    if (lastName) userData.lastName = lastName;
    if (password) userData.passwordHash = await hashPassword(password);

    const profileData = {};
    for (const field of config.allowedProfileEdit ?? []) {
        if (rest[field] !== undefined) profileData[field] = rest[field];
    }

    try {
        const user = await userRepository.updateUserWithProfile({
            id: Number(id),
            institutionId: requester.institutionId,
            userData,
            profileField: config.profileField,
            profileData,
        });

        if (role === 'student' && rest.courseId !== undefined) {
            if (!canAnyRole(requester.roles, 'student:enroll')) {
                throw new ServiceError('No tenés permisos para matricular alumnos', 403);
            }
            await userRepository.assignStudentCourse({
                studentProfileId: user.studentProfile.id,
                courseId: rest.courseId ? Number(rest.courseId) : null,
            });
        }

        return serializeUser(user, config.profileField);
    } catch (error) {
        if (error.code === 'P2002') throw new ServiceError('El email o DNI ya está en uso', 409);
        if (error.code === 'P2025') throw new ServiceError('Usuario no encontrado', 404);
        throw error;
    }
};

export const toggleUserStatusService = async (role, id, isActive, requester) => {
    const config = assertRoleConfig(role);
    const permissionKey = isActive
        ? (config.permissions.reactivate ?? config.permissions.toggle)
        : config.permissions.toggle;

    assertPermission(requester.roles, permissionKey);

    try {
        const user = await userRepository.setUserActive({
            id: Number(id),
            institutionId: requester.institutionId,
            isActive: Boolean(isActive),
        });
        return { id: user.id, isActive: user.isActive };
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Usuario no encontrado', 404);
        throw error;
    }
};

export const deleteUserService = async (role, id, requester) => {
    const config = assertRoleConfig(role);
    assertPermission(requester.roles, config.permissions.delete);

    try {
        await userRepository.deleteUserById({ id: Number(id), institutionId: requester.institutionId });
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Usuario no encontrado', 404);
        throw error;
    }
};


function serializeUserWithRoles(user) {
    return {
        id: user.id,
        dni: user.dni,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        roles: getRolesFromUser(user),
        profiles: {
            student: user.studentProfile,
            teacher: user.teacherProfile,
            preceptor: user.preceptorProfile,
            director: user.directorProfile,
        },
    };
}

export const getUserWithRolesService = async (id, requester) => {
    assertPermission(requester.roles, 'user:manageRoles');

    const user = await userRepository.findUserWithAllProfiles({
        id: Number(id),
        institutionId: requester.institutionId,
    });
    if (!user) throw new ServiceError('Usuario no encontrado', 404);

    return serializeUserWithRoles(user);
};

// rolesPayload: { student?: { enabled, legajoStudent }, teacher?: { enabled, legajoTeacher, specialty }, ... }
// Solo se tocan las claves presentes; una clave ausente = "no cambiar ese rol".
export const updateUserRolesService = async (id, rolesPayload, requester) => {
    assertPermission(requester.roles, 'user:manageRoles');

    const user = await userRepository.findUserWithAllProfiles({
        id: Number(id),
        institutionId: requester.institutionId,
    });
    if (!user) throw new ServiceError('Usuario no encontrado', 404);

    for (const role of Object.keys(ROLE_CONFIG)) {
        const desired = rolesPayload[role];
        if (desired === undefined) continue;

        const config = getRoleConfig(role);
        const currentlyHas = Boolean(user[config.profileField]);

        if (desired.enabled && !currentlyHas) {
            if (!config.permissions.create) {
                throw new ServiceError(`El rol "${role}" no se asigna directamente (usa invitación)`, 400);
            }
            assertPermission(requester.roles, config.permissions.create);

            for (const field of config.requiredCreateFields ?? []) {
                if (!desired[field]) throw new ServiceError(`Falta "${field}" para asignar el rol ${role}`, 400);
            }

            await userRepository.addProfileToUser({
                id: Number(id),
                profileField: config.profileField,
                profileData: config.buildProfileCreate(desired),
            });
        }

        if (!desired.enabled && currentlyHas) {
            assertPermission(requester.roles, config.permissions.delete);
            await userRepository.removeProfileFromUser({ id: Number(id), profileField: config.profileField });
        }
    }

    const updated = await userRepository.findUserWithAllProfiles({
        id: Number(id),
        institutionId: requester.institutionId,
    });
    return serializeUserWithRoles(updated);
};