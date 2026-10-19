import { getPrisma } from '../config/prisma.js';

const prisma = () => getPrisma();
const relations = {
  institution: { select: { id: true, nombre: true, direccion: true } },
  audiences: true,
  careers: { include: { career: { select: { id: true, nombre: true } } } },
  courses: { include: { course: { select: { id: true, nombre: true, careerId: true } } } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  revisions: { orderBy: { version: 'desc' }, select: { id: true, version: true, action: true, createdAt: true, createdById: true } },
};

export const institutionCommunicationRepository = {
  get: (id) => prisma().institutionEvent.findUnique({ where: { id }, include: relations }),
  list: (institutionId) => prisma().institutionEvent.findMany({
    where: { institutionId, deletedAt: null }, include: relations,
    orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
  }),
  listOptions: async (institutionId) => {
    const db = prisma();
    const [careers, courses, institution] = await Promise.all([
      db.career.findMany({ where: { institutionId }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }),
      db.course.findMany({ where: { institutionId }, select: { id: true, nombre: true, careerId: true }, orderBy: { nombre: 'asc' } }),
      db.institution.findUnique({ where: { id: institutionId }, select: { id: true, nombre: true, direccion: true } }),
    ]);
    return { careers, courses, institution };
  },
  softDelete: (id, updatedById) => prisma().institutionEvent.update({ where: { id }, data: { deletedAt: new Date(), updatedById } }),
  careers: (institutionId, ids) => prisma().career.findMany({ where: { institutionId, id: { in: ids } }, select: { id: true } }),
  courses: (institutionId, ids) => prisma().course.findMany({ where: { institutionId, id: { in: ids } }, select: { id: true, careerId: true } }),
  // Only fetch members of the selected institution; profile relations determine eligibility.
  members: (institutionId) => prisma().user.findMany({
    where: { institutionId, isActive: true },
    select: {
      id: true, email: true, isSuperAdmin: true,
      directorProfile: { select: { id: true } },
      preceptorProfile: { select: { id: true } },
      teacherProfile: { select: { teacherSubjects: { where: { isActive: true }, select: { courseId: true, course: { select: { careerId: true } } } } } },
      studentProfile: { select: { courses: { select: { courseId: true, course: { select: { careerId: true } } } } } },
    },
  }),
  async save({ old, data, actorId, recipientIds, removedRecipientIds = [] }) {
    return prisma().$transaction(async (tx) => {
      const scopeLinks = {
        audiences: { create: data.roles.map(role => ({ role })) },
        careers: { create: data.careerIds.map(careerId => ({ careerId })) },
        courses: { create: data.courseIds.map(courseId => ({ courseId })) },
      };
      const fields = {
        title: data.title, details: data.details, startsAt: data.startsAt, endsAt: data.endsAt,
        kind: data.kind, scope: data.scope, suspensionReason: data.suspensionReason,
        locationType: data.locationType, venueName: data.venueName, venueAddress: data.venueAddress,
        affectedActivities: data.affectedActivities, affectedShifts: data.affectedShifts,
      };
      let record;
      if (old) {
        record = await tx.institutionEvent.update({ where: { id: old.id }, data: {
          ...fields, updatedById: actorId,
          audiences: { deleteMany: {}, ...scopeLinks.audiences },
          careers: { deleteMany: {}, ...scopeLinks.careers },
          courses: { deleteMany: {}, ...scopeLinks.courses },
        } });
      } else {
        record = await tx.institutionEvent.create({ data: {
          ...fields, institutionId: data.institutionId, createdById: actorId, ...scopeLinks,
        } });
      }
      if (old) {
        // No enviar correos obsoletos cuando la comunicación fue modificada.
        await tx.notificationDelivery.updateMany({
          where: { channel: 'EMAIL', status: 'PENDING', notification: { institutionEventId: old.id } },
          data: { status: 'CANCELLED', lastError: 'Reemplazado por una nueva revisión' },
        });
      }
      const version = old ? (old.revisions[0]?.version ?? 0) + 1 : 1;
      await tx.institutionEventRevision.create({ data: {
        institutionEventId: record.id, version, action: old ? 'UPDATED' : 'CREATED',
        createdById: actorId, snapshot: { ...data, startsAt: data.startsAt.toISOString(), endsAt: data.endsAt.toISOString() },
      } });
      const type = old ? 'EVENT_UPDATED' : 'EVENT_CREATED';
      const label = data.kind === 'SUSPENSION' ? 'Suspensión de actividades' : 'Evento institucional';
      const body = `${old ? 'Comunicación actualizada' : 'Nueva comunicación'}: ${label}\n${data.title}\n${data.details}\nDesde: ${data.startsAt.toISOString()}\nHasta: ${data.endsAt.toISOString()}\nVersión: ${version}`;
      for (const id of recipientIds) {
        const n = await tx.notification.create({ data: {
          userId: id, institutionEventId: record.id, type, title: `${label}: ${data.title}`, message: body, revision: version,
        } });
        const user = await tx.user.findUnique({ where: { id }, select: { email: true } });
        if (user?.email) await tx.notificationDelivery.create({ data: { notificationId: n.id, channel: 'EMAIL', recipient: user.email } });
      }
      for (const id of removedRecipientIds) {
        const n = await tx.notification.create({ data: {
          userId: id, institutionEventId: record.id, type: 'EVENT_CANCELLED',
          title: `Ya no estás incluido: ${data.title}`,
          message: 'La comunicación institucional se actualizó y ya no está dirigida a tu grupo.', revision: version,
        } });
        const user = await tx.user.findUnique({ where: { id }, select: { email: true } });
        if (user?.email) await tx.notificationDelivery.create({ data: { notificationId: n.id, channel: 'EMAIL', recipient: user.email } });
      }
      return { id: record.id, version, recipients: recipientIds.length, removedRecipients: removedRecipientIds.length };
    });
  },
  async cancel(old, actorId, reason, recipientIds) {
    return prisma().$transaction(async tx => {
      await tx.notificationDelivery.updateMany({
        where: { channel: 'EMAIL', status: 'PENDING', notification: { institutionEventId: old.id } },
        data: { status: 'CANCELLED', lastError: 'Comunicación cancelada' },
      });
      const version = (old.revisions[0]?.version ?? 0) + 1;
      await tx.institutionEvent.update({ where: { id: old.id }, data: {
        isActive: false, cancelledAt: new Date(), cancellationReason: reason, updatedById: actorId,
      } });
      await tx.institutionEventRevision.create({ data: {
        institutionEventId: old.id, version, action: 'CANCELLED', createdById: actorId,
        snapshot: { reason, previous: old.title },
      } });
      for (const id of recipientIds) {
        const n = await tx.notification.create({ data: {
          userId: id, institutionEventId: old.id, type: 'EVENT_CANCELLED',
          title: `Cancelación de ${old.kind === 'SUSPENSION' ? 'suspensión de actividades' : 'evento'}: ${old.title}`, message: old.kind === 'SUSPENSION'
            ? `La suspensión de clases fue cancelada. Las clases se desarrollarán normalmente según el horario habitual, salvo que la institución comunique otra disposición.${reason ? ` Motivo: ${reason}` : ''}`
            : `El evento institucional fue cancelado y no se realizará según lo anunciado.${reason ? ` Motivo: ${reason}` : ''}`, revision: version,
        } });
        const user = await tx.user.findUnique({ where: { id }, select: { email: true } });
        if (user?.email) await tx.notificationDelivery.create({ data: { notificationId: n.id, channel: 'EMAIL', recipient: user.email } });
      }
      return { id: old.id, version, cancelled: true };
    });
  },
};
