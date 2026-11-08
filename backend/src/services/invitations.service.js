import { randomUUID } from 'node:crypto';
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

export const createInvitationService = async ({ email, role, courseId, institutionId }, requester) => {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !role) throw new ServiceError('Ingresá un correo válido y un rol', 400);

    const permissionKey = INVITATION_TARGET_PERMISSION[role];
    if (!permissionKey) throw new ServiceError('Rol de invitación inválido', 400);
    if (!canAnyRole(requester.roles, permissionKey)) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }

    const destinationInstitutionId = requester.isSuperAdmin && institutionId != null
        ? Number(institutionId) : Number(requester.institutionId);
    if (!Number.isSafeInteger(destinationInstitutionId) || destinationInstitutionId < 1)
        throw new ServiceError('Debés seleccionar una institución de destino válida', 400);
    if (!requester.isSuperAdmin && destinationInstitutionId !== Number(requester.institutionId))
        throw new ServiceError('No podés invitar usuarios de otra institución', 403);

    let resolvedCourseId = null;
    if (role === 'STUDENT') {
        if (!courseId) throw new ServiceError('Debés indicar el curso del alumno invitado', 400);
        const course = await academicRepository.findCourseInInstitution(Number(courseId), destinationInstitutionId);
        if (!course) throw new ServiceError('El curso no pertenece a tu institución', 403);
        if (isOnlyTeacher(requester.roles)) {
            const teacherProfile = await academicRepository.findTeacherProfileByUserId(requester.id);
            if (!teacherProfile || !await academicRepository.findTeacherAssignment(teacherProfile.id, Number(courseId)))
                throw new ServiceError('Ese curso no está asignado a tu perfil docente', 403);
        }
        resolvedCourseId = course.id;
    }

    const invitation = await invitationRepository.createInvitation({
        email: email.trim().toLowerCase(),
        role,
        invitedById: requester.id,
        institutionId: destinationInstitutionId,
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
    if (!dni || typeof password !== 'string' || password.length < 8 || password.length > 72 || !firstName || !lastName) {
        throw new ServiceError('Faltan campos obligatorios', 400);
    }

    const invitation = await invitationRepository.findInvitationByToken(token);
    if (!invitation) throw new ServiceError('Invitación no encontrada', 404);
    if (invitation.isUsed) throw new ServiceError('Esta invitación ya fue utilizada', 400);
    if (invitation.expiresAt < new Date()) throw new ServiceError('Esta invitación expiró', 400);

    if (!invitation.email || !invitation.institutionId) throw new ServiceError('Invitación sin correo o institución válidos', 400);
    if (invitation.role === 'STUDENT' && (!invitation.courseId || invitation.course?.institutionId !== invitation.institutionId))
        throw new ServiceError('La invitación del alumno no tiene un curso válido. Solicitá una nueva.', 409);
    const passwordHash = await hashPassword(password);
    const providedLegajo = typeof legajo === 'string' ? legajo.trim() : '';
    // Legajo opcional para todos los roles: los campos únicos internos no pueden quedar vacíos.

    const profileByRole = {
        TEACHER: { teacherProfile: { create: { legajoTeacher: providedLegajo || `DOC-${randomUUID()}`, specialty } } },
        PRECEPTOR: { preceptorProfile: { create: { legajoPreceptor: providedLegajo || `PRE-${randomUUID()}`, shift } } },
        DIRECTOR: { directorProfile: { create: { position } } },
        STUDENT: {
            studentProfile: {
                create: {
                    legajoStudent: providedLegajo || `ALU-${randomUUID()}`,
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
                // La institución de destino pertenece a la invitación, no a la cuenta de quien la emitió.
                institutionId: invitation.institutionId,
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
        institutionName: invitation.institution?.nombre || 'Institución educativa',
        courseName: invitation.course?.nombre || null,
        activeOnAcceptance: true,
        expiresAt: invitation.expiresAt,
    };
};