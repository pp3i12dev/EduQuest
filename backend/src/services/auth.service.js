
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { getRolesFromUser } from '../utils/rols.js';

import * as userRepository from '../repositories/user.repository.js';
import { getPrisma } from '../config/prisma.js';
import * as academicRepository from '../repositories/academic.repository.js';
import { createVerificationChallenge, ensureVerificationEmailConfigured, sendVerificationToUser } from './publicRegistration.service.js';

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

    // Defensa adicional: un alta pública incompleta nunca obtiene acceso,
    // aunque una operación administrativa cambie isActive por error.
    if (user.requestedRole && user.signupStatus !== 'APPROVED' && user.isActive) {
        throw new ServiceError('La cuenta todavía no completó la verificación o autorización necesaria.', 403);
    }
    if (!user.isActive) {
        const message = user.signupStatus === 'REJECTED'
            ? 'Tu solicitud fue rechazada. Contactá a tu institución para consultar.'
            : user.signupStatus === 'PENDING' && user.requestedRole && !user.emailVerifiedAt
              ? 'Primero verificá tu dirección de correo electrónico. Revisá el enlace que te enviamos.'
              : user.signupStatus === 'PENDING'
                ? user.requestedRole === 'STUDENT' ? 'Verificá tu correo para activar tu cuenta.' : 'Tu solicitud de personal está pendiente de aprobación institucional.'
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
    // Alta automática ≠ comprobar pertenencia real al curso. Bloqueada por
    // defecto en producción hasta que la institución valide el procedimiento
    // de matrícula (p. ej. código de inscripción por curso).
    if (process.env.NODE_ENV === 'production' && process.env.PUBLIC_STUDENT_ENROLLMENT_ENABLED !== 'true') {
        throw new ServiceError('La inscripción pública de alumnos todavía no está habilitada para esta institución.', 503);
    }
    ensureVerificationEmailConfigured();
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
    const institution = await getPrisma().institution.findFirst({
        where: { id: Number(institutionId), isActive: true }, select: { id: true },
    });
    if (!institution) throw new ServiceError('La institución no está disponible para nuevas inscripciones.', 400);

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

    if (!/^\d{7,12}$/.test(normalizedDni)) throw new ServiceError('Ingresá un DNI válido.', 400);
    const existingEmail = await getPrisma().user.findFirst({ where: { email: { equals: normalizedEmail, mode: 'insensitive' } } });
    if (existingEmail) {
        throw new ServiceError('El correo electrónico ya está registrado. Iniciá sesión, recuperá tu contraseña o contactá a la institución.', 409);
    }
    const existingDni = await userRepository.findUserByEmailOrDni({ dni: normalizedDni });
    if (existingDni) {
        throw new ServiceError('El DNI ya está registrado. Si es tu cuenta, intentá iniciar sesión o contactá a la institución.', 409);
    }

    const passwordHash = await hashPassword(password);
    const challenge = createVerificationChallenge();

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
            tokenHash: challenge.tokenHash,
            expiresAt: challenge.expiresAt,
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

    try {
        await sendVerificationToUser(user, challenge.raw);
    } catch (error) {
        console.error('[EduQuest] Falló la verificación por correo del alumno:', error?.message);
        throw new ServiceError('Tu cuenta se creó, pero no pudimos enviar el mensaje. Utilizá «Reenviar verificación».', 503);
    }
    return {
        message: 'Registro completo. Revisá tu correo para verificarlo y activar tu cuenta automáticamente.',
        userId: user.id,
    };
};
