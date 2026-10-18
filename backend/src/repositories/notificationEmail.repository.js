import { getPrisma } from '../config/prisma.js';

export const notificationEmailRepository = {
  async listPending(limit = 20) {
    return getPrisma().notificationDelivery.findMany({
      where: { channel: 'EMAIL', status: 'PENDING', attempts: { lt: 3 } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  },

  async claim(id) {
    const prisma = getPrisma();
    const result = await prisma.notificationDelivery.updateMany({
      where: { id, channel: 'EMAIL', status: 'PENDING', attempts: { lt: 3 } },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });
    if (!result.count) return null;
    return prisma.notificationDelivery.findUnique({
      where: { id },
      include: {
        notification: {
          select: {
            title: true, message: true, type: true,
            earlyNotice: { include: {
              affectedClasses: {
                orderBy: [{ classDate: 'asc' }, { startTime: 'asc' }],
                include: { teacherSubject: { select: {
                  subject: { select: { nombre: true } },
                  course: { select: { nombre: true } },
                } } },
              },
              subject: { select: { nombre: true } },
              course: { select: { nombre: true } },
              createdBy: { select: { firstName: true, lastName: true, directorProfile: { select: { id: true } }, preceptorProfile: { select: { id: true } }, teacherProfile: { select: { id: true } } } },
              teacherSubject: { select: { teacher: { select: { user: { select: { firstName: true, lastName: true } } } } } },
            } },
          },
        },
      },
    });
  },

  cancelPendingForNotice(earlyNoticeId) {
    return getPrisma().notificationDelivery.updateMany({
      where: { channel: 'EMAIL', status: 'PENDING', notification: { earlyNoticeId, type: 'EARLY_NOTICE_PENDING' } },
      data: { status: 'CANCELLED', lastError: 'Aviso resuelto antes del envío del correo provisional' },
    });
  },

  markSent(id, messageId) {
    return getPrisma().notificationDelivery.updateMany({
      where: { id, status: 'PROCESSING' },
      data: { status: 'SENT', sentAt: new Date(), providerMessageId: messageId || null, lastError: null },
    });
  },

  markFailure(id, errorMessage, attempts) {
    return getPrisma().notificationDelivery.updateMany({
      where: { id, status: 'PROCESSING' },
      data: {
        status: attempts >= 3 ? 'FAILED' : 'PENDING',
        lastError: String(errorMessage).slice(0, 2000),
      },
    });
  },

  cancel(id, reason) {
    return getPrisma().notificationDelivery.updateMany({
      where: { id, status: 'PROCESSING' },
      data: { status: 'CANCELLED', lastError: reason },
    });
  },
};
