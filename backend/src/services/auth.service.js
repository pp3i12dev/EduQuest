
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { getRolesFromUser } from '../utils/rols.js';

import * as userRepository from '../repositories/user.repository.js';
import * as academicRepository from '../repositories/academic.repository.js';

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
        throw new ServiceError(
            'Tu cuenta todavía no fue aprobada. Contactá a tu institución.',
            403
        );
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
    const passwordHash = await hashPassword(password);

    const user =
        await userRepository.createStudentSelfSignup({
            userData: {
                dni,
                email,
                passwordHash,
                firstName,
                lastName,
                telefono: typeof telefono === 'string' && telefono.trim() ? telefono.trim() : null,
                institutionId: Number(institutionId),
            },
            courseId: Number(courseId),
        });

    return {
        message:
            'Registro exitoso. Tu cuenta queda pendiente de aprobación por la institución.',
        userId: user.id,
    };
};
