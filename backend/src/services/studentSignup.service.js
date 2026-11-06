import { getPrisma } from '../config/prisma.js';
import { canAnyRole } from '../config/permissions.js';
import { enqueueWebPushForNotification } from './webPush.service.js';
import { sendStudentSignupDecisionEmail } from '../utils/mailer.js';

const fail = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};

function authorize(user) {
  if (!user?.id || !canAnyRole(user.roles || [], 'selfSignup:approve')) {
    fail('Solo directivos y preceptores autorizados pueden revisar inscripciones.', 403);
  }
  if (!user.isSuperAdmin && !(Number(user.institutionId) > 0)) {
    fail('No tenés una institución asignada.', 403);
  }
}

const inInstitution = (user) => user.isSuperAdmin ? {} : { institutionId: Number(user.institutionId) };

const courseFields = {
  select: {
    courses: { select: { course: {
      select: { id: true, nombre: true, academicYear: true, shift: true, institutionId: true,
        career: { select: { id: true, nombre: true } },
        institution: { select: { id: true, nombre: true } } },
    } } },
  },
};

const viewFields = {
  id: true, firstName: true, lastName: true, dni: true, email: true,
  telefono: true, institutionId: true, isActive: true, createdAt: true,
  signupStatus: true, signupReviewedAt: true, signupReviewReason: true,
  studentProfile: courseFields,
};

export async function listSignupRequests(requester, query = {}) {
  authorize(requester);
  const status = String(query.status || 'PENDING').toUpperCase();
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) fail('Estado inválido');
  const courseId = Number(query.courseId);
  if (!Number.isSafeInteger(courseId) || courseId < 1) fail('Seleccioná un curso para consultar sus solicitudes.');
  const exists = await getPrisma().course.findFirst({ where: { id: courseId, ...inInstitution(requester) }, select: { id: true } });
  if (!exists) fail('Curso inexistente o fuera de tu institución.', 404);
  return getPrisma().user.findMany({
    where: { ...inInstitution(requester), signupStatus: status,
      studentProfile: { is: { courses: { some: { courseId } } } } },
    select: viewFields,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 500,
  });
}

export async function listSignupCourseGroups(requester, query = {}) {
  authorize(requester);
  const status = String(query.status || 'PENDING').toUpperCase();
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) fail('Estado inválido');
  const db = getPrisma();
  const courses = await db.course.findMany({
    where: inInstitution(requester),
    select: {
      id: true, nombre: true, academicYear: true, shift: true, institutionId: true,
      institution: { select: { id: true, nombre: true } },
      career: { select: { id: true, nombre: true } },
      _count: { select: { students: { where: {
        student: { user: { signupStatus: status } },
      } } } },
    },
    orderBy: [{ institution: { nombre: 'asc' } }, { nombre: 'asc' }],
  });
  const enrolled = courses.length ? await db.studentCourse.groupBy({
    by: ['courseId'], where: { courseId: { in: courses.map(c => c.id) } }, _count: { _all: true },
  }) : [];
  const totals = new Map(enrolled.map(x => [x.courseId, x._count._all]));
  return courses.map(({ _count, ...course }) => ({ ...course, requestCount: _count.students,
    enrolledCount: totals.get(course.id) || 0 }));
}

function checkIds(ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 100) {
    fail('Seleccioná entre 1 y 100 solicitudes.');
  }
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
    fail('La selección contiene identificadores inválidos o repetidos.');
  }
  return ids;
}

// Todas las aprobaciones/rechazos se realizan en una sola transacción.
// Si cambia una solicitud o se intenta modificar otra institución, no se aprueba ninguna.
export async function reviewSignupRequests(requester, body, decision) {
  authorize(requester);
  const ids = checkIds(body?.ids);
  if (!['APPROVED', 'REJECTED'].includes(decision)) fail('Decisión inválida');
  const reason = decision === 'REJECTED' ? String(body?.reason || '').trim() : null;
  if (decision === 'REJECTED' && (reason.length < 5 || reason.length > 500)) {
    fail('Indicá un motivo de rechazo de entre 5 y 500 caracteres.');
  }
  const db = getPrisma();
  const affected = await db.$transaction(async (tx) => {
    const rows = await tx.user.findMany({
      where: { id: { in: ids }, ...inInstitution(requester), signupStatus: 'PENDING',
        isActive: false, studentProfile: { isNot: null } },
      select: { id: true, email: true, firstName: true, lastName: true, institutionId: true },
    });
    if (rows.length !== ids.length) {
      fail('Una o más solicitudes ya fueron revisadas o no pertenecen a tu institución.', 409);
    }
    const result = await tx.user.updateMany({
      where: { id: { in: ids }, ...inInstitution(requester), signupStatus: 'PENDING',
        isActive: false, studentProfile: { isNot: null } },
      data: { signupStatus: decision, isActive: decision === 'APPROVED',
        signupReviewedAt: new Date(), signupReviewedById: requester.id,
        signupReviewReason: reason },
    });
    if (result.count !== ids.length) fail('Las solicitudes cambiaron durante la operación. Reintentá.', 409);
    return rows;
  });
  // Correo best-effort: una caída del SMTP nunca revierte aprobaciones confirmadas en DB.
  // No crear suscripción Push para una persona que todavía no puede iniciar sesión.
  if (process.env.SMTP_HOST && process.env.MAIL_FROM) {
    for (let i = 0; i < affected.length; i += 5) {
      const results = await Promise.allSettled(affected.slice(i, i + 5).map(user =>
        sendStudentSignupDecisionEmail({ to: user.email, name: user.firstName,
          status: decision, reason })
      ));
      results.forEach((result, index) => {
        if (result.status === 'rejected') console.warn('[EduQuest][Inscripciones] Correo no entregado para usuario',
          affected[i + index].id, result.reason?.message);
      });
    }
  }
  return { processed: affected.length, status: decision, ids };
}

// Se ejecuta después de guardar una solicitud pública, desde React o Unity.
// Solo directivos/preceptores de la institución reciben notificación interna y Web Push.
export async function safeQueueSignupForAuthorities({ studentUserId, institutionId }) {
  try {
    const db = getPrisma();
    const reviewers = await db.user.findMany({
      where: { institutionId, isActive: true,
        OR: [{ directorProfile: { isNot: null } }, { preceptorProfile: { isNot: null } }] },
      select: { id: true },
    });
    if (!reviewers.length) return;
    await db.$transaction(async tx => {
      for (const reviewer of reviewers) {
        const notification = await tx.notification.upsert({
          where: { userId_signupUserId_type_revision: {
            userId: reviewer.id, signupUserId: studentUserId,
            type: 'STUDENT_REGISTRATION_REQUEST', revision: 1,
          } },
          create: { userId: reviewer.id, signupUserId: studentUserId,
            type: 'STUDENT_REGISTRATION_REQUEST',
            title: 'Nueva solicitud de inscripción',
            message: 'Una nueva solicitud de alumno espera revisión en Gestión de usuarios.',
            revision: 1 },
          update: {},
        });
        await enqueueWebPushForNotification(tx, reviewer.id, notification.id);
      }
    });
  } catch (error) {
    console.error('[EduQuest][Inscripciones] No se pudo registrar aviso para autoridades:', error);
  }
}
