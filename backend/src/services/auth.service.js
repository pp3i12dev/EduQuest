
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { getRolesFromUser } from '../utils/rols.js';

import * as userRepository from '../repositories/user.repository.js';
import * as academicRepository from '../repositories/academic.repository.js';
import { safeQueueSignupForAuthorities } from './studentSignup.service.js';

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}


export const loginService = async ({ email, dni, password }) => {
    if (!password || (!email && !dni)) {
        throw new ServiceError(
            'Debe ingresar email/DNI y contraseña',
            400
        );
    }

    const user = await userRepository.findUserByEmailOrDni({
        email,
        dni,
    });

    if (!user) {
        throw new ServiceError(
            'Credenciales incorrectas',
            401
        );
    }

    const isValidPassword = await comparePassword(
        password,
        user.passwordHash
    );

    if (!isValidPassword) {
        throw new ServiceError(
            'Credenciales incorrectas',
            401
        );
    }

    if (!user.isActive) {
        const message = user.signupStatus === 'REJECTED'
            ? 'Tu solicitud fue rechazada. Contactá a tu institución para consultar.'
            : user.signupStatus === 'PENDING'
              ? 'Tu inscripción está pendiente de aprobación institucional.'
              : 'Tu cuenta está desactivada. Contactá a tu institución.';
        throw new ServiceError(message, 403);
    }

    const isSuperAdmin = user.isSuperAdmin === true;

    const profileRoles = getRolesFromUser(user);

    const roles = isSuperAdmin
        ? [...new Set(['SUPER_ADMIN', ...profileRoles])]
        : profileRoles;

    const token = generateToken({
        id: user.id,
        email: user.email,
        institutionId: user.institutionId,
        isSuperAdmin,
        roles,
    });

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            institutionId: user.institutionId,
            isSuperAdmin,
            roles,
            directorProfile: user.directorProfile,
            teacherProfile: user.teacherProfile,
            preceptorProfile: user.preceptorProfile,
            studentProfile: user.studentProfile,
        },
    };
};



export const registerStudentService = async (data) => {
    const {
        dni,
        email,
        password,
        firstName,
        lastName,
        telefono,
        careerId,
        institutionId,
        courseId,
    } = data;

    if (
        !dni ||
        !email ||
        !password ||
        !firstName ||
        !lastName ||
        !institutionId ||
        !courseId
    ) {
        throw new ServiceError(
            'Faltan campos obligatorios',
            400
        );
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        throw new ServiceError('La contraseña debe tener entre 8 y 128 caracteres', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
        throw new ServiceError('Ingresá un correo electrónico válido', 400);
    }

    const course =
        await academicRepository.findCourseInInstitution(
            Number(courseId),
            Number(institutionId)
        );

    if (!course) {
        throw new ServiceError(
            'El curso indicado no pertenece a esa institución',
            400
        );
    }

    if (careerId != null && course.careerId !== Number(careerId)) {
        throw new ServiceError('El curso no pertenece a la carrera seleccionada', 400);
    }
    // Mensaje amigable antes de intentar insertar. Sigue siendo necesario capturar P2002,
    // porque dos solicitudes simultáneas podrían pasar esta comprobación a la vez.
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedDni = String(dni).trim();
    if (!normalizedEmail || !normalizedDni) {
        throw new ServiceError('Completá un correo electrónico y DNI válidos.', 400);
    }

    const existingEmail = await userRepository.findUserByEmailOrDni({ email: normalizedEmail });
    if (existingEmail) {
        throw new ServiceError('El correo electrónico ya está registrado. Iniciá sesión, recuperá tu contraseña o consultá la aprobación de tu cuenta con la institución.', 409);
    }
    const existingDni = await userRepository.findUserByEmailOrDni({ dni: normalizedDni });
    if (existingDni) {
        throw new ServiceError('El DNI ya está registrado. Si es tu cuenta, intentá iniciar sesión o contactá a la institución.', 409);
    }

    const passwordHash = await hashPassword(password);

    let user;
    try {
        user = await userRepository.createStudentSelfSignup({
            userData: {
                dni: normalizedDni,
                email: normalizedEmail,
                passwordHash,
                firstName,
                lastName,
                telefono: typeof telefono === 'string' && telefono.trim() ? telefono.trim() : null,
                institutionId: Number(institutionId),
            },
            courseId: Number(courseId),
        });
    } catch (error) {
        if (error?.code !== 'P2002') throw error;
        // Prisma 7 + adaptador Neon no siempre informa meta.target.
        // Revisamos ambas claves tras la colisión, sin revelar el stack de Prisma.
        const byEmail = await userRepository.findUserByEmailOrDni({ email: normalizedEmail });
        if (byEmail) {
            throw new ServiceError('El correo electrónico ya está registrado. Iniciá sesión o recuperá la contraseña. Si tu cuenta está pendiente, contactá a la institución.', 409);
        }
        const byDni = await userRepository.findUserByEmailOrDni({ dni: normalizedDni });
        if (byDni) {
            throw new ServiceError('El DNI ya está registrado. Contactá a la institución si necesitás recuperar tu cuenta.', 409);
        }
        throw new ServiceError('Ya existe un registro con alguno de los datos ingresados. Revisá correo y DNI.', 409);
    }

    await safeQueueSignupForAuthorities({
        studentUserId: user.id,
        institutionId: user.institutionId,
    });
    return {
        message:
            'Registro exitoso. Tu cuenta queda pendiente de aprobación por la institución.',
        userId: user.id,
    };
};
