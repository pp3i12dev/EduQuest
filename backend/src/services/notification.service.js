import { notificationRepository as repo } from '../repositories/notification.repository.js';
import { notificationEmailRepository as emailRepo } from '../repositories/notificationEmail.repository.js';

// Esta etapa registra notificaciones y entregas pendientes.
// No envía email ni WhatsApp hasta configurar proveedores oficiales.
const userIdFromJwt = (jwt) => {
    const id = Number(jwt?.id ?? jwt?.userId ?? jwt?.sub);
    if (!Number.isSafeInteger(id) || id <= 0) {
        const error = new Error('Sesión inválida'); error.status = 401; throw error;
    }
    return id;
};

export const notificationService = {
    async publish(notice) {
        if (!notice.isActive) return 0;
        if (notice.status === 'CONFIRMED' || notice.status === 'REJECTED') {
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
        if (notice.status === 'PENDING') {
            const teacher = await repo.findTeacher(notice.teacherUserId);
            if (!teacher?.isActive) return 0;
            return repo.publish(notice, 'EARLY_NOTICE_PENDING',
                'Aviso temprano pendiente de revisión',
                `PENDIENTE DE CONFIRMACIÓN DOCENTE. Las clases siguen programadas hasta confirmación.\n${detail}`, [teacher, ...students]);
        }
        if (notice.status === 'CONFIRMED') {
            return repo.publish(notice, 'EARLY_NOTICE_CONFIRMED',
                'Aviso temprano confirmado',
                `Se confirmó ${kind}.\n${detail}`, students);
        }
        if (notice.status === 'REJECTED') {
            const creator = await repo.findTeacher(notice.createdById);
            return repo.publish(notice, 'EARLY_NOTICE_REJECTED',
                'Aviso temprano rechazado',
                `Aviso rechazado: las clases continúan según el horario oficial.\n${detail}`, [...(creator?.isActive ? [creator] : []), ...students]);
        }
        return 0;
    },
    async safePublish(notice) {
        try { return await this.publish(notice); }
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
