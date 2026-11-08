import { getPrisma } from '../config/prisma.js';
import { enqueueWebPushForNotification } from '../services/webPush.service.js';

const prisma = getPrisma();

export const notificationRepository = {
    findNoticeClasses(earlyNoticeId) {
        return prisma.earlyNoticeClass.findMany({
            where: { earlyNoticeId },
            include: { teacherSubject: { include: {
                course: { select: { id: true, nombre: true } },
                subject: { select: { id: true, nombre: true } },
            } } },
            orderBy: [{ classDate: 'asc' }, { startTime: 'asc' }],
        });
    },
    findTeacher(userId) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, telefono: true, isActive: true },
        });
    },
    findStudentsByCourse(courseId) {
        return prisma.studentCourse.findMany({
            where: { courseId, student: { user: { isActive: true } } },
            select: { student: { select: { user: {
                select: { id: true, email: true, telefono: true, isActive: true },
            } } } },
        });
    },
    async publish(notice, type, title, message, users, revision = 1) {
        if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Revisión inválida");
        const recipients = [...new Map(users.filter(u => u?.isActive !== false).map(u => [u.id, u])).values()];
        return prisma.$transaction(async (tx) => {
            for (const user of recipients) {
                const notification = await tx.notification.upsert({
                    where: { userId_earlyNoticeId_type_revision: {
                        userId: user.id, earlyNoticeId: notice.id, type, revision,
                    } },
                    create: { userId: user.id, earlyNoticeId: notice.id, type, title, message, revision },
                    update: {},
                });
                await enqueueWebPushForNotification(tx, user.id, notification.id);
                const channels = [
                    user.email && { channel: 'EMAIL', recipient: user.email },
                ].filter(Boolean);
                for (const delivery of channels) {
                    await tx.notificationDelivery.upsert({
                        where: { notificationId_channel: {
                            notificationId: notification.id, channel: delivery.channel,
                        } },
                        create: { notificationId: notification.id, ...delivery },
                        update: {},
                    });
                }
            }
            return recipients.length;
        });
    },
    // Una entrada visible por aviso temprano. Las notificaciones de cada revisión
    // permanecen en la base para auditar entregas sin duplicarse en el listado.
    // Para comunicaciones institucionales u otros eventos se conserva el comportamiento previo.
    listForUser(userId, { skip, take }) {
        return prisma.$queryRaw`
            WITH ranked AS (
                SELECT n."id", n."type", n."title", n."message", n."isRead",
                       n."readAt", n."createdAt", n."earlyNoticeId",
                       n."institutionEventId", n."revision",
                       e."status"::text AS "noticeStatus",
                       ROW_NUMBER() OVER (
                         PARTITION BY CASE
                           WHEN n."earlyNoticeId" IS NOT NULL
                             THEN 'early:' || n."earlyNoticeId"::text
                           ELSE 'event:' || n."id"::text
                         END
                         ORDER BY n."createdAt" DESC, n."id" DESC
                       ) AS row_num
                  FROM "Notification" n
                  LEFT JOIN "EarlyNotice" e ON e."id" = n."earlyNoticeId"
                 WHERE n."userId" = ${userId}
            )
            SELECT "id", "type"::text AS "type", "title", "message", "isRead",
                   "readAt", "createdAt", "earlyNoticeId", "institutionEventId",
                   "revision", "noticeStatus"
              FROM ranked
             WHERE row_num = 1
             ORDER BY "createdAt" DESC, "id" DESC
             LIMIT ${take} OFFSET ${skip}
        `;
    },
    async countUnread(userId) {
        const results = await prisma.$queryRaw`
          WITH ranked AS (
              SELECT n."isRead", ROW_NUMBER() OVER (
                PARTITION BY CASE
                  WHEN n."earlyNoticeId" IS NOT NULL
                    THEN 'early:' || n."earlyNoticeId"::text
                  ELSE 'event:' || n."id"::text
                END
                ORDER BY n."createdAt" DESC, n."id" DESC
              ) AS row_num
              FROM "Notification" n
              WHERE n."userId" = ${userId}
          )
          SELECT COUNT(*)::integer AS count
          FROM ranked WHERE row_num = 1 AND "isRead" = false
        `;
        return Number(results[0]?.count || 0);
    },
    markRead(userId, id) {
        return prisma.notification.updateMany({
            where: { id, userId }, data: { isRead: true, readAt: new Date() },
        });
    },
};
