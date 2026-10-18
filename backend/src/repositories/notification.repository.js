import { getPrisma } from '../config/prisma.js';

const prisma = getPrisma();

export const notificationRepository = {
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
    async publish(notice, type, title, message, users) {
        const recipients = [...new Map(users.filter(u => u?.isActive !== false).map(u => [u.id, u])).values()];
        return prisma.$transaction(async (tx) => {
            for (const user of recipients) {
                const notification = await tx.notification.upsert({
                    where: { userId_earlyNoticeId_type: {
                        userId: user.id, earlyNoticeId: notice.id, type,
                    } },
                    create: { userId: user.id, earlyNoticeId: notice.id, type, title, message },
                    update: {},
                });
                const channels = [
                    user.email && { channel: 'EMAIL', recipient: user.email },
                    user.telefono && { channel: 'WHATSAPP', recipient: user.telefono },
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
    listForUser(userId, { skip, take }) {
        return prisma.notification.findMany({
            where: { userId }, orderBy: { createdAt: 'desc' }, skip, take,
            select: { id: true, type: true, title: true, message: true,
                isRead: true, readAt: true, createdAt: true, earlyNoticeId: true },
        });
    },
    countUnread(userId) {
        return prisma.notification.count({ where: { userId, isRead: false } });
    },
    markRead(userId, id) {
        return prisma.notification.updateMany({
            where: { id, userId }, data: { isRead: true, readAt: new Date() },
        });
    },
};
