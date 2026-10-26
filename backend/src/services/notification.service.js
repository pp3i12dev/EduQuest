import { notificationRepository as repo } from '../repositories/notification.repository.js';
import { notificationEmailRepository as emailRepo } from '../repositories/notificationEmail.repository.js';
import { fcmMessaging } from './firebaseAdmin.service.js';

const userIdFromJwt = (jwt) => {
    const id = Number(jwt?.id ?? jwt?.userId ?? jwt?.sub);
    if (!Number.isSafeInteger(id) || id <= 0) {
        const error = new Error('Sesión inválida'); error.status = 401; throw error;
    }
    return id;
};

export const notificationService = {
    // Función auxiliar interna para disparar FCM a una lista de usuarios
    async _sendPushToUsers(users, title, body, dataPayload = {}) {
        try {
            const userIds = users.map(u => u.id).filter(Boolean);
            if (userIds.length === 0) return;

            const devices = await repo.prisma.userDevice.findMany({
                where: { userId: { in: userIds } },
                select: { token: true },
            });

            const tokens = devices.map(d => d.token);
            if (tokens.length === 0) return;

            await fcmMessaging.sendEachForMulticast({
                tokens: tokens,
                notification: { title, body },
                data: {
                    ...dataPayload,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                },
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'canal_ausencias',
                        priority: 'max',
                        sound: 'default',
                        visibility: 'public',
                    },
                },
            });
        } catch (error) {
            console.error('[FCM] Error al enviar notificaciones push:', error);
        }
    },

    async publish(notice, { event = null, revision = 1 } = {}) {
        if (!notice.isActive) return 0;
        if (event || notice.status === 'CONFIRMED' || notice.status === 'REJECTED') {
            await emailRepo.cancelPendingForNotice(notice.id);
        }
        const affected = await repo.findNoticeClasses(notice.id);
        const courseIds = [...new Set(affected.map(c => c.teacherSubject.courseId))];
        if (!courseIds.length) courseIds.push(notice.courseId);
        const allRows = (await Promise.all(courseIds.map(id => repo.findStudentsByCourse(id)))).flat();
        const students = [...new Map(allRows.map(r => r.student.user).map(u => [u.id, u])).values()];
        const lines = affected.map(c => {
            const d = c.classDate.toISOString().slice(0, 10);
            return `${d} ${c.startTime}-${c.endTime} · ${c.teacherSubject.subject.nombre} · ${c.teacherSubject.course.nombre}`;
        });
        const base = `${notice.teacherSubject?.teacher?.user?.firstName ?? 'Docente'} ${notice.teacherSubject?.teacher?.user?.lastName ?? ''}`.trim();
        const detail = `${base}\nClases afectadas:\n${lines.join('\n') || 'Consultar aviso'}${notice.virtualMeetingUrl ? `\nVideollamada: ${notice.virtualMeetingUrl}` : ''}${notice.virtualInstructions ? `\nMaterial: ${notice.virtualInstructions}` : ''}`;
        const kinds = { ABSENCE: 'ausencia', LATE_ARRIVAL: 'llegada tarde', ATTENDANCE_CONFIRMED: 'asistencia confirmada', VIRTUAL_SYNCHRONOUS: 'clase virtual sincrónica', VIRTUAL_ASYNCHRONOUS: 'clase virtual asincrónica' };
        const kind = kinds[notice.type] || 'aviso';
        
        if (event === 'UPDATED') {
            const teacher = await repo.findTeacher(notice.teacherUserId);
            const recipients = notice.status === 'PENDING'
                ? [...(teacher?.isActive ? [teacher] : []), ...students]
                : students;
            const warning = notice.status === 'PENDING'
                ? 'PENDIENTE DE CONFIRMACIÓN DOCENTE. Las clases siguen programadas hasta confirmación.\n'
                : '';
            
            const title = `Aviso temprano actualizado (versión ${revision})`;
            const bodyText = `${warning}Actualización #${revision} del aviso.`;
            
            // Disparar push FCM a los destinatarios de esta actualización
            await this._sendPushToUsers(recipients, title, bodyText, { noticeId: String(notice.id), type: 'EARLY_NOTICE_UPDATED' });

            return repo.publish(notice, 'EARLY_NOTICE_UPDATED', title, `${warning}Actualización #${revision} del aviso.\n${detail}`, recipients, revision);
        }
        if (notice.status === 'PENDING') {
            const teacher = await repo.findTeacher(notice.teacherUserId);
            if (!teacher?.isActive) return 0;
            const recipients = [teacher, ...students];
            
            const title = 'Aviso temprano pendiente de revisión';
            const bodyText = 'PENDIENTE DE CONFIRMACIÓN DOCENTE.';
            
            await this._sendPushToUsers(recipients, title, bodyText, { noticeId: String(notice.id), type: 'EARLY_NOTICE_PENDING' });

            return repo.publish(notice, 'EARLY_NOTICE_PENDING', title, `PENDIENTE DE CONFIRMACIÓN DOCENTE. Las clases siguen programadas hasta confirmación.\n${detail}`, recipients, revision);
        }
        if (notice.status === 'CONFIRMED') {
            const title = 'Aviso temprano confirmado';
            const bodyText = `Se confirmó ${kind}.`;

            await this._sendPushToUsers(students, title, bodyText, { noticeId: String(notice.id), type: 'EARLY_NOTICE_CONFIRMED' });

            return repo.publish(notice, 'EARLY_NOTICE_CONFIRMED', title, `Se confirmó ${kind}.\n${detail}`, students, revision);
        }
        if (notice.status === 'REJECTED') {
            const creator = await repo.findTeacher(notice.createdById);
            const recipients = [...(creator?.isActive ? [creator] : []), ...students];
            
            const title = 'Aviso temprano rechazado';
            const bodyText = 'Aviso rechazado: las clases continúan según el horario oficial.';

            await this._sendPushToUsers(recipients, title, bodyText, { noticeId: String(notice.id), type: 'EARLY_NOTICE_REJECTED' });

            return repo.publish(notice, 'EARLY_NOTICE_REJECTED', title, `Aviso rechazado: las clases continúan según el horario oficial.\n${detail}`, recipients, revision);
        }
        return 0;
    },
    async safePublish(notice, options = {}) {
        try { return await this.publish(notice, options); }
        catch (error) {
            console.error('[EarlyNotice][Notifications] Falló el registro; requiere reintento:', notice.id, error);
            return 0;
        }
    },
    async list(jwtUser, query = {}) {
        const userId = userIdFromJwt(jwtUser);
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const [data, unreadCount] = await Promise.all([
            repo.listForUser(userId, { skip: (page - 1) * limit, take: limit }),
            repo.countUnread(userId),
        ]);
        return { data, unreadCount, page, limit };
    },
    async unreadCount(jwtUser) {
        return { unreadCount: await repo.countUnread(userIdFromJwt(jwtUser)) };
    },
    async markRead(jwtUser, id) {
        const userId = userIdFromJwt(jwtUser);
        const noticeId = Number(id);
        if (!Number.isSafeInteger(noticeId) || noticeId <= 0) {
            const error = new Error('ID inválido'); error.status = 400; throw error;
        }
        const result = await repo.markRead(userId, noticeId);
        if (!result.count) {
            const error = new Error('Notificación no encontrada'); error.status = 404; throw error;
        }
        return { ok: true };
    },
};