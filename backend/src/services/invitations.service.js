import { hashPassword } from '../utils/password.js';
import { sendInvitationEmail } from '../utils/mailer.js';
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
    if (requester.isSuperAdmin) return invitationRepository.listAllInvitations();
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
        institutionId: requester.institutionId,
        courseId: resolvedCourseId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000),
    });

    try {
        await sendInvitationEmail({
            to: invitation.email,
            token: invitation.token,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
        });
    } catch (error) {
        console.error('Error enviando email de invitación:', error);
        // No dejamos una invitación "Pendiente" que nunca llegó
        await invitationRepository.deleteInvitation(invitation.id);
        throw new ServiceError('No se pudo enviar el correo de invitación', 502);
    }

    if (process.env.NODE_ENV !== 'production') {
        console.log(`📧 Invitación enviada a ${email} — token: ${invitation.token}`);
    }

    // El token no se devuelve al cliente: solo viaja por email
    const { token, ...safeInvitation } = invitation;
    return safeInvitation;
};

// Se aplica el mismo alcance a borrado simple y masivo, incluso si se manipula la API.
function canManageInvitation(invitation, requester) {
    if (requester.isSuperAdmin) return true;
    if (isOnlyTeacher(requester.roles)) return Number(invitation.invitedById) === Number(requester.id);
    return Number(invitation.institutionId) === Number(requester.institutionId);
}
function canRemove(requester) {
    if (!requester.isSuperAdmin && !canAnyRole(requester.roles, 'invitation:cancel'))
        throw new ServiceError('No tenés permisos para eliminar invitaciones.', 403);
}
const validId = value => {
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n <= 0) throw new ServiceError('Identificador inválido.', 400);
    return n;
};
export const cancelInvitationService = async (id, requester) => {
    canRemove(requester);
    const invitation = await invitationRepository.findInvitationById(validId(id));
    if (!invitation) throw new ServiceError('Invitación no encontrada.', 404);
    if (!canManageInvitation(invitation, requester)) throw new ServiceError('No podés eliminar invitaciones de otra institución.', 403);
    // Borrar pendientes equivale a revocar el token. Las utilizadas no afectan al usuario creado.
    await invitationRepository.deleteInvitation(invitation.id);
};
export const cleanupInvitationsService = async (body, requester) => {
    canRemove(requester);
    const ids = Array.isArray(body?.ids) ? body.ids.map(validId) : [];
    if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length)
        throw new ServiceError('Seleccioná entre 1 y 100 invitaciones distintas.', 400);
    const items = await Promise.all(ids.map(id => invitationRepository.findInvitationById(id)));
    const now = Date.now();
    if (items.some(item => !item || !canManageInvitation(item, requester)))
        throw new ServiceError('El lote contiene invitaciones inexistentes o fuera de tu institución.', 403);
    if (items.some(item => !item.isUsed && new Date(item.expiresAt).getTime() > now))
        throw new ServiceError('Las invitaciones pendientes deben cancelarse individualmente antes de la limpieza masiva.', 409);
    const result = await invitationRepository.cleanupInvitations(ids);
    return { deleted: result.count };
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
                    ...(invitation.courseId
                        ? { courses: { create: { courseId: invitation.courseId } } }
                        : {}),
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

export const getInvitationByTokenService = async (token) => {
    const invitation = await invitationRepository.findInvitationByToken(token);
    if (!invitation) throw new ServiceError('Invitación no encontrada', 404);
    if (invitation.isUsed) throw new ServiceError('Esta invitación ya fue utilizada', 400);
    if (invitation.expiresAt < new Date()) throw new ServiceError('Esta invitación expiró', 400);

    // Solo lo mínimo que necesita el formulario
    return {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
    };
};