import { hashPassword } from '../utils/password.js';
import { canAnyRole, INVITATION_TARGET_PERMISSION } from '../config/permissions.js';
import * as invitationRepository from '../repositories/invitation.repository.js';
import * as academicRepository from '../repositories/academic.repository.js';

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const INVITATION_TTL_HOURS = 72;

function isOnlyTeacher(roles) {
    return roles.length === 1 && roles[0] === 'TEACHER';
}

export const listInvitationsService = async (requester) => {
    if (!canAnyRole(requester.roles, 'invitation:list')) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }

    return isOnlyTeacher(requester.roles)
        ? invitationRepository.findInvitationsByInviter(requester.id)
        : invitationRepository.findInvitationsByInstitution(requester.institutionId);
};

export const createInvitationService = async ({ email, role, courseId }, requester) => {
    if (!email || !role) throw new ServiceError('Faltan campos obligatorios', 400);

    const permissionKey = INVITATION_TARGET_PERMISSION[role];
    if (!permissionKey) throw new ServiceError('Rol de invitación inválido', 400);
    if (!canAnyRole(requester.roles, permissionKey)) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }

    let resolvedCourseId = null;

    if (role === 'STUDENT' && isOnlyTeacher(requester.roles)) {
        if (!courseId) throw new ServiceError('Debés indicar a qué curso invitás al alumno', 400);

        const teacherProfile = await academicRepository.findTeacherProfileByUserId(requester.id);
        const assignment = await academicRepository.findTeacherAssignment(teacherProfile.id, Number(courseId));
        if (!assignment) throw new ServiceError('Ese curso no está asignado a tu perfil docente', 403);

        resolvedCourseId = Number(courseId);
    }

    const invitation = await invitationRepository.createInvitation({
        email,
        role,
        invitedById: requester.id,
        courseId: resolvedCourseId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000),
    });

    console.log(`📧 Invitación creada para ${email} — token: ${invitation.token}`); // TODO: email real

    return invitation;
};

export const cancelInvitationService = async (id, requester) => {
    if (!canAnyRole(requester.roles, 'invitation:cancel')) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }

    const invitation = await invitationRepository.findInvitationById(Number(id));
    if (!invitation) throw new ServiceError('Invitación no encontrada', 404);

    if (isOnlyTeacher(requester.roles) && invitation.invitedById !== requester.id) {
        throw new ServiceError('Solo podés cancelar invitaciones que vos mismo enviaste', 403);
    }

    await invitationRepository.deleteInvitation(Number(id));
};

export const acceptInvitationService = async (token, body) => {
    const { dni, password, firstName, lastName, legajo, specialty, shift, position } = body;
    if (!dni || !password || !firstName || !lastName) {
        throw new ServiceError('Faltan campos obligatorios', 400);
    }

    const invitation = await invitationRepository.findInvitationByToken(token);
    if (!invitation) throw new ServiceError('Invitación no encontrada', 404);
    if (invitation.isUsed) throw new ServiceError('Esta invitación ya fue utilizada', 400);
    if (invitation.expiresAt < new Date()) throw new ServiceError('Esta invitación expiró', 400);

    const invitedByUser = await invitationRepository.findUserById(invitation.invitedById);
    const passwordHash = await hashPassword(password);

    const profileByRole = {
        TEACHER: { teacherProfile: { create: { legajoTeacher: legajo, specialty } } },
        PRECEPTOR: { preceptorProfile: { create: { legajoPreceptor: legajo, shift } } },
        DIRECTOR: { directorProfile: { create: { position } } },
        STUDENT: {
            studentProfile: {
                create: {
                    legajoStudent: legajo,
                    ...(invitation.courseId ? { courses: { create: { courseId: invitation.courseId } } } : {}),
                },
            },
        },
    };

    try {
        const user = await invitationRepository.createUserFromInvitation({
            invitationId: invitation.id,
            userCreateData: {
                dni,
                email: invitation.email,
                passwordHash,
                firstName,
                lastName,
                institutionId: invitedByUser.institutionId,
                isActive: true,
                ...profileByRole[invitation.role],
            },
        });
        return { message: 'Cuenta creada con éxito', userId: user.id };
    } catch (error) {
        if (error.code === 'P2002') throw new ServiceError('El email, DNI o legajo ya está en uso', 409);
        throw error;
    }
};