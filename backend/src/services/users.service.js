
import {
    hashPassword,
    comparePassword,
} from '../utils/password.js';

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

    if (!config) {
        throw new ServiceError('Rol inválido', 400);
    }

    return config;
}

function assertPermission(requesterRoles, permissionKey) {
    if (
        !permissionKey ||
        !canAnyRole(requesterRoles, permissionKey)
    ) {
        throw new ServiceError(
            'No tenés permisos para esta acción',
            403
        );
    }
}

// ======================================================
// VALIDACIÓN DE TELÉFONOS ARGENTINOS
// ======================================================

/**
 * Admite teléfonos fijos y celulares argentinos:
 *
 * 221 456-7890
 * 221 15-456-7890
 * 11 1234-5678
 * 11 15-1234-5678
 * +54 221 456-7890
 * +54 9 221 456-7890
 *
 * También acepta números sin separadores.
 *
 * Los códigos de área argentinos tienen entre
 * 2 y 4 dígitos. La longitud nacional del número
 * sin el prefijo móvil 15 es de 10 dígitos.
 *
 * Esta validación comprueba el formato general,
 * no si una línea telefónica realmente existe.
 */
function normalizeArgentinePhone(value) {
    if (value === null || value === '') {
        return null;
    }

    if (typeof value !== 'string') {
        throw new ServiceError(
            'El teléfono debe ser texto',
            400
        );
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    if (trimmed.length > 35) {
        throw new ServiceError(
            'El teléfono es demasiado largo',
            400
        );
    }

    if (!/^\+?[\d\s().-]+$/.test(trimmed)) {
        throw new ServiceError(
            'El teléfono contiene caracteres no permitidos',
            400
        );
    }

    const plusCount = (trimmed.match(/\+/g) || []).length;

    if (plusCount > 1 || (trimmed.includes('+') && !trimmed.startsWith('+'))) {
        throw new ServiceError(
            'El prefijo internacional del teléfono es inválido',
            400
        );
    }

    const digits = trimmed.replace(/\D/g, '');

    if (!digits) {
        throw new ServiceError(
            'Ingresá un número de teléfono válido',
            400
        );
    }

    let national = digits;
    let isInternational = false;
    let isInternationalMobile = false;

    if (trimmed.startsWith('+')) {
        if (!digits.startsWith('54')) {
            throw new ServiceError(
                'El teléfono debe tener el prefijo internacional de Argentina (+54)',
                400
            );
        }

        national = digits.slice(2);
        isInternational = true;

        if (national.startsWith('9')) {
            national = national.slice(1);
            isInternationalMobile = true;
        }
    } else if (national.startsWith('0054')) {
        national = national.slice(4);
        isInternational = true;

        if (national.startsWith('9')) {
            national = national.slice(1);
            isInternationalMobile = true;
        }
    }

    // El prefijo 0 corresponde a llamadas nacionales.
    if (!isInternational && national.startsWith('0')) {
        national = national.slice(1);
    }

    if (!/^\d+$/.test(national)) {
        throw new ServiceError(
            'El número de teléfono es inválido',
            400
        );
    }

    // Un teléfono argentino tiene 10 dígitos
    // entre código de área y número de abonado.
    // En celulares nacionales puede incluir el 15.
    const isTenDigits = national.length === 10;

    const isNationalMobile =
        !isInternationalMobile &&
        national.length === 12 &&
        (
            national.slice(2, 4) === '15' ||
            national.slice(3, 5) === '15' ||
            national.slice(4, 6) === '15'
        );

    if (!isTenDigits && !isNationalMobile) {
        throw new ServiceError(
            'Ingresá un teléfono argentino válido, fijo o celular',
            400
        );
    }

    // Los números internacionales con +54 9
    // ya vienen sin el prefijo nacional 15.
    if (isInternationalMobile && !isTenDigits) {
        throw new ServiceError(
            'El celular internacional debe tener 10 dígitos después de +54 9',
            400
        );
    }

    // Se conserva el formato ingresado, eliminando
    // espacios innecesarios. Esto permite mostrar
    // al usuario un número fácilmente reconocible.
    return trimmed.replace(/\s+/g, ' ');
}

// ======================================================
// SERIALIZACIÓN GENERAL
// ======================================================

// Incluimos institutionId para que el frontend pueda
// filtrar usuarios por institución.
function serializeUser(user, profileField) {
    return {
        id: user.id,
        dni: user.dni,
        email: user.email,
        telefono: user.telefono ?? null,
        firstName: user.firstName,
        lastName: user.lastName,
        institutionId: user.institutionId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        profile: user[profileField] ?? null,
    };
}

// ======================================================
// LISTAR USUARIOS
// ======================================================

export const listUsersService = async (role, requester) => {
    const config = assertRoleConfig(role);

    assertPermission(
        requester.roles,
        config.permissions.list
    );

    const isSuperAdmin =
        requester.isSuperAdmin === true ||
        requester.roles?.includes('SUPER_ADMIN');

    const institutionId = isSuperAdmin
        ? null
        : requester.institutionId;

    if (!isSuperAdmin && institutionId == null) {
        throw new ServiceError(
            'El usuario no tiene una institución asignada',
            403
        );
    }

    const users = await userRepository.listUsersByProfile({
        institutionId,
        profileField: config.profileField,
    });

    return users.map((user) =>
        serializeUser(user, config.profileField)
    );
};

// ======================================================
// CREAR USUARIO
// ======================================================

export const createUserService = async (role, body, requester) => {
    const config = assertRoleConfig(role);

    if (!config.permissions.create) {
        throw new ServiceError(
            'Este rol se crea mediante invitación, no directamente',
            400
        );
    }

    assertPermission(
        requester.roles,
        config.permissions.create
    );

    const {
        dni,
        email,
        password,
        firstName,
        lastName,
        ...rest
    } = body;

    if (
        !dni ||
        !email ||
        !password ||
        !firstName ||
        !lastName
    ) {
        throw new ServiceError(
            'Faltan campos obligatorios',
            400
        );
    }

    for (const field of config.requiredCreateFields ?? []) {
        if (!rest[field]) {
            throw new ServiceError(
                `Falta el campo "${field}"`,
                400
            );
        }
    }

    const passwordHash = await hashPassword(password);

    try {
        const user = await userRepository.createUserWithProfile({
            userData: {
                dni,
                email,
                passwordHash,
                firstName,
                lastName,
                institutionId: requester.institutionId,
            },
            profileField: config.profileField,
            profileData: config.buildProfileCreate(rest),
        });

        if (role === 'student' && rest.courseId !== undefined) {
            if (!canAnyRole(requester.roles, 'student:enroll')) {
                throw new ServiceError(
                    'No tenés permisos para matricular alumnos',
                    403
                );
            }

            await userRepository.assignStudentCourse({
                studentProfileId: user.studentProfile.id,
                courseId: rest.courseId
                    ? Number(rest.courseId)
                    : null,
            });
        }

        return serializeUser(user, config.profileField);
    } catch (error) {
        if (error.code === 'P2002') {
            throw new ServiceError(
                'El email, DNI o legajo ya está en uso',
                409
            );
        }

        throw error;
    }
};

// ======================================================
// ACTUALIZAR USUARIO
// ======================================================

export const updateUserService = async (
    role,
    id,
    body,
    requester
) => {
    const config = assertRoleConfig(role);

    assertPermission(
        requester.roles,
        config.permissions.edit
    );

    const {
        dni,
        email,
        firstName,
        lastName,
        password,
        ...rest
    } = body;

    const userData = {};

    if (dni) userData.dni = dni;
    if (email) userData.email = email;
    if (firstName) userData.firstName = firstName;
    if (lastName) userData.lastName = lastName;

    if (password) {
        userData.passwordHash = await hashPassword(password);
    }

    const profileData = {};

    for (const field of config.allowedProfileEdit ?? []) {
        if (rest[field] !== undefined) {
            profileData[field] = rest[field];
        }
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
                throw new ServiceError(
                    'No tenés permisos para matricular alumnos',
                    403
                );
            }

            await userRepository.assignStudentCourse({
                studentProfileId: user.studentProfile.id,
                courseId: rest.courseId
                    ? Number(rest.courseId)
                    : null,
            });
        }

        return serializeUser(user, config.profileField);
    } catch (error) {
        if (error.code === 'P2002') {
            throw new ServiceError(
                'El email o DNI ya está en uso',
                409
            );
        }

        if (error.code === 'P2025') {
            throw new ServiceError(
                'Usuario no encontrado',
                404
            );
        }

        throw error;
    }
};

// ======================================================
// ACTIVAR / DESACTIVAR USUARIO
// ======================================================

export const toggleUserStatusService = async (
    role,
    id,
    isActive,
    requester
) => {
    const config = assertRoleConfig(role);

    const permissionKey = isActive
        ? (
            config.permissions.reactivate ??
            config.permissions.toggle
        )
        : config.permissions.toggle;

    assertPermission(requester.roles, permissionKey);

    try {
        const user = await userRepository.setUserActive({
            id: Number(id),
            institutionId: requester.institutionId,
            isActive: Boolean(isActive),
        });

        return {
            id: user.id,
            isActive: user.isActive,
        };
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ServiceError(
                'Usuario no encontrado',
                404
            );
        }

        throw error;
    }
};

// ======================================================
// ELIMINAR USUARIO
// ======================================================

export const deleteUserService = async (
    role,
    id,
    requester
) => {
    const config = assertRoleConfig(role);

    assertPermission(
        requester.roles,
        config.permissions.delete
    );

    try {
        await userRepository.deleteUserById({
            id: Number(id),
            institutionId: requester.institutionId,
        });
    } catch (error) {
        if (error.code === 'P2025') {
            throw new ServiceError(
                'Usuario no encontrado',
                404
            );
        }

        throw error;
    }
};

// ======================================================
// GESTIÓN DE ROLES
// ======================================================

function serializeUserWithRoles(user) {
    return {
        id: user.id,
        dni: user.dni,
        email: user.email,
        telefono: user.telefono ?? null,
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

export const getUserWithRolesService = async (
    id,
    requester
) => {
    assertPermission(
        requester.roles,
        'user:manageRoles'
    );

    const user = await userRepository.findUserWithAllProfiles({
        id: Number(id),
        institutionId: requester.institutionId,
    });

    if (!user) {
        throw new ServiceError(
            'Usuario no encontrado',
            404
        );
    }

    return serializeUserWithRoles(user);
};

// rolesPayload:
// {
//   student?: { enabled, legajoStudent },
//   teacher?: { enabled, legajoTeacher, specialty },
//   ...
// }
//
// Solo se tocan las claves presentes.
// Una clave ausente significa "no cambiar ese rol".
export const updateUserRolesService = async (
    id,
    rolesPayload,
    requester
) => {
    assertPermission(
        requester.roles,
        'user:manageRoles'
    );

    const user = await userRepository.findUserWithAllProfiles({
        id: Number(id),
        institutionId: requester.institutionId,
    });

    if (!user) {
        throw new ServiceError(
            'Usuario no encontrado',
            404
        );
    }

    for (const role of Object.keys(ROLE_CONFIG)) {
        const desired = rolesPayload[role];

        if (desired === undefined) {
            continue;
        }

        const config = getRoleConfig(role);

        const currentlyHas = Boolean(
            user[config.profileField]
        );

        if (desired.enabled && !currentlyHas) {
            if (!config.permissions.create) {
                throw new ServiceError(
                    `El rol "${role}" no se asigna directamente (usa invitación)`,
                    400
                );
            }

            assertPermission(
                requester.roles,
                config.permissions.create
            );

            for (const field of config.requiredCreateFields ?? []) {
                if (!desired[field]) {
                    throw new ServiceError(
                        `Falta "${field}" para asignar el rol ${role}`,
                        400
                    );
                }
            }

            await userRepository.addProfileToUser({
                id: Number(id),
                profileField: config.profileField,
                profileData: config.buildProfileCreate(desired),
            });
        }

        if (!desired.enabled && currentlyHas) {
            assertPermission(
                requester.roles,
                config.permissions.delete
            );

            await userRepository.removeProfileFromUser({
                id: Number(id),
                profileField: config.profileField,
            });
        }
    }

    const updated = await userRepository.findUserWithAllProfiles({
        id: Number(id),
        institutionId: requester.institutionId,
    });

    return serializeUserWithRoles(updated);
};

// ======================================================
// MI PERFIL - SERVICIOS DEL USUARIO AUTENTICADO
// ======================================================

/**
 * Devuelve solo información pública del propio usuario.
 * Nunca expone passwordHash.
 *
 * No se envían los objetos Prisma de perfiles completos
 * para evitar exponer campos internos innecesarios.
 */
function serializeMyProfile(user) {
    const roles = getRolesFromUser(user);

    const isSuperAdmin = user.isSuperAdmin === true;

    const allRoles = isSuperAdmin
        ? [...new Set(['SUPER_ADMIN', ...roles])]
        : roles;

    return {
        id: user.id,
        dni: user.dni,
        email: user.email,
        telefono: user.telefono ?? null,
        firstName: user.firstName,
        lastName: user.lastName,
        institutionId: user.institutionId,
        isActive: user.isActive,
        isSuperAdmin,
        createdAt: user.createdAt,
        roles: allRoles,
        profiles: {
            student: user.studentProfile
                ? {
                    legajoStudent:
                        user.studentProfile.legajoStudent,
                }
                : null,
            teacher: user.teacherProfile
                ? {
                    legajoTeacher:
                        user.teacherProfile.legajoTeacher,
                    specialty:
                        user.teacherProfile.specialty,
                }
                : null,
            preceptor: user.preceptorProfile
                ? {
                    legajoPreceptor:
                        user.preceptorProfile.legajoPreceptor,
                    shift:
                        user.preceptorProfile.shift,
                }
                : null,
            director: user.directorProfile
                ? {
                    position:
                        user.directorProfile.position,
                }
                : null,
        },
    };
};

/**
 * GET /api/users/me
 */
export const getMyProfileService = async (requester) => {
    const user = await userRepository.findOwnUserProfile(
        requester.id
    );

    if (!user || !user.isActive) {
        throw new ServiceError(
            'Usuario no encontrado o inactivo',
            404
        );
    }

    return serializeMyProfile(user);
};

/**
 * PATCH /api/users/me
 *
 * Campos editables:
 * firstName, lastName, email, telefono.
 *
 * No permite modificar roles, DNI,
 * institución ni estado de la cuenta.
 */
export const updateMyProfileService = async (
    body,
    requester
) => {
    if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body)
    ) {
        throw new ServiceError(
            'Los datos del perfil son inválidos',
            400
        );
    }

    const allowedFields = [
        'firstName',
        'lastName',
        'email',
        'telefono',
    ];

    const receivedFields = Object.keys(body);

    const invalidFields = receivedFields.filter(
        field => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0) {
        throw new ServiceError(
            `No está permitido modificar: ${invalidFields.join(', ')}`,
            400
        );
    }

    if (receivedFields.length === 0) {
        throw new ServiceError(
            'No se enviaron cambios',
            400
        );
    }

    const data = {};

    for (const field of receivedFields) {
        const value = body[field];

        // El teléfono es opcional y puede eliminarse.
        if (field === 'telefono') {
            data.telefono = normalizeArgentinePhone(value);
            continue;
        }

        if (typeof value !== 'string') {
            throw new ServiceError(
                `El campo ${field} debe ser texto`,
                400
            );
        }

        const cleanedValue = value.trim();

        if (!cleanedValue) {
            throw new ServiceError(
                `El campo ${field} no puede estar vacío`,
                400
            );
        }

        data[field] = cleanedValue;
    }

    if (data.firstName && data.firstName.length > 100) {
        throw new ServiceError(
            'El nombre no puede superar 100 caracteres',
            400
        );
    }

    if (data.lastName && data.lastName.length > 100) {
        throw new ServiceError(
            'El apellido no puede superar 100 caracteres',
            400
        );
    }

    if (data.email) {
        data.email = data.email.toLowerCase();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            data.email.length > 254 ||
            !emailRegex.test(data.email)
        ) {
            throw new ServiceError(
                'Ingresá un correo electrónico válido',
                400
            );
        }
    }

    try {
        const updatedUser =
            await userRepository.updateOwnUserProfile({
                userId: requester.id,
                data,
            });

        return serializeMyProfile(updatedUser);
    } catch (error) {
        if (error.code === 'P2002') {
            throw new ServiceError(
                'El correo electrónico ya está registrado',
                409
            );
        }

        if (error.code === 'P2025') {
            throw new ServiceError(
                'Usuario no encontrado',
                404
            );
        }

        throw error;
    }
};

/**
 * PATCH /api/users/me/password
 *
 * Requiere la contraseña actual.
 * La nueva contraseña no se devuelve ni
 * se almacena en texto plano.
 */
export const changeMyPasswordService = async (
    body,
    requester
) => {
    if (
        !body ||
        typeof body !== 'object' ||
        Array.isArray(body)
    ) {
        throw new ServiceError(
            'Los datos de contraseña son inválidos',
            400
        );
    }

    const {
        currentPassword,
        newPassword,
        confirmPassword,
    } = body;

    if (
        typeof currentPassword !== 'string' ||
        typeof newPassword !== 'string' ||
        typeof confirmPassword !== 'string'
    ) {
        throw new ServiceError(
            'Completá todos los campos de contraseña',
            400
        );
    }

    if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
    ) {
        throw new ServiceError(
            'Completá todos los campos de contraseña',
            400
        );
    }

    if (newPassword.length < 8) {
        throw new ServiceError(
            'La nueva contraseña debe tener al menos 8 caracteres',
            400
        );
    }

    if (newPassword.length > 128) {
        throw new ServiceError(
            'La nueva contraseña no puede superar 128 caracteres',
            400
        );
    }

    if (newPassword !== confirmPassword) {
        throw new ServiceError(
            'Las contraseñas nuevas no coinciden',
            400
        );
    }

    if (currentPassword === newPassword) {
        throw new ServiceError(
            'La nueva contraseña debe ser diferente de la actual',
            400
        );
    }

    const user = await userRepository.findOwnUserProfile(
        requester.id
    );

    if (!user || !user.isActive) {
        throw new ServiceError(
            'Usuario no encontrado o inactivo',
            404
        );
    }

    if (!user.passwordHash) {
        throw new ServiceError(
            'La cuenta no tiene una contraseña configurada',
            400
        );
    }

    const isCurrentPasswordValid =
        await comparePassword(
            currentPassword,
            user.passwordHash
        );

    if (!isCurrentPasswordValid) {
        throw new ServiceError(
            'La contraseña actual es incorrecta',
            400
        );
    }

    const newPasswordHash = await hashPassword(
        newPassword
    );

    const result =
        await userRepository.updateOwnPasswordHash({
            userId: requester.id,
            passwordHash: newPasswordHash,
            previousPasswordHash: user.passwordHash,
        });

    if (result.count !== 1) {
        throw new ServiceError(
            'No se pudo actualizar la contraseña. Volvé a intentarlo.',
            409
        );
    }

    return {
        message: 'Contraseña actualizada correctamente',
    };
};
