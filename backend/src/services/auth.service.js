import * as userRepository from '../repositories/user.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';

export const registerStudentService = async (data) => {
    const existingUser = await userRepository.findUserByEmail(data.email);
    if (existingUser) {
        throw new Error('El correo electrónico ya está registrado');
    }

    const passwordHash = await hashPassword(data.password);

    const userData = {
        dni: data.dni,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        institutionId: data.institutionId,
    };

    const studentData = {
        legajoStudent: `ALU-${Date.now()}`,
    };

    const newUser = await userRepository.createStudentTransaction(userData, studentData, data.courseId);

    delete newUser.passwordHash;

    const token = generateToken({ userId: newUser.id, isStudent: true });
    return { user: newUser, token };
};

export const registerTeacherService = async (data) => {
    const existingUser = await userRepository.findUserByEmail(data.email);
    if (existingUser) {
        throw new Error('El correo electrónico ya está registrado');
    }

    const passwordHash = await hashPassword(data.password);

    const userData = {
        dni: data.dni,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        institutionId: data.institutionId,
    };

    const teacherData = {
        legajoTeacher: `DOC-${Date.now()}`,
        specialty: data.specialty || 'General',
    };

    const newUser = await userRepository.createTeacherTransaction(userData, teacherData, data.invitationToken);

    delete newUser.passwordHash;

    const token = generateToken({ userId: newUser.id, isTeacher: true });
    return { user: newUser, token };
};

export const loginService = async (email, password) => {
    const user = await userRepository.findUserByEmail(email);
    if (!user || !user.isActive) {
        throw new Error('Credenciales incorrectas');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Credenciales incorrectas');
    }

    const roles = {
        isStudent: !!user.studentProfile,
        isTeacher: !!user.teacherProfile,
        isPreceptor: !!user.preceptorProfile,
        isDirector: !!user.directorProfile,
    };

    const token = generateToken({ userId: user.id, ...roles });

    delete user.passwordHash;

    return { user, roles, token };
};