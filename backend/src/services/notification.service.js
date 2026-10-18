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
        const base = `${notice.subject?.nombre ?? 'Materia'} · ${notice.course?.nombre ?? 'Curso'}`;
        if (notice.status === 'PENDING') {
            const teacher = await repo.findTeacher(notice.teacherUserId);
            if (!teacher?.isActive) return 0;
            const rows = await repo.findStudentsByCourse(notice.courseId);
            const students = rows.map(row => row.student.user);
            return repo.publish(notice, 'EARLY_NOTICE_PENDING',
                'Aviso temprano pendiente de revisión',
                `El aviso de ${base} espera confirmación del docente.`, [teacher, ...students]);
        }
        if (notice.status === 'CONFIRMED') {
            const rows = await repo.findStudentsByCourse(notice.courseId);
            const students = rows.map(row => row.student.user);
            const kind = notice.type === 'ABSENCE' ? 'ausencia' : 'llegada tarde';
            return repo.publish(notice, 'EARLY_NOTICE_CONFIRMED',
                'Aviso temprano confirmado',
                `Se informó una ${kind} docente para ${base}. Revisá la fecha y el horario en Avisos Tempranos.`, students);
        }
        if (notice.status === 'REJECTED') {
            const creator = await repo.findTeacher(notice.createdById);
            const rows = await repo.findStudentsByCourse(notice.courseId);
            const students = rows.map(row => row.student.user);
            return repo.publish(notice, 'EARLY_NOTICE_REJECTED',
                'Aviso temprano rechazado',
                `El docente rechazó el aviso de ${base}.`, [...(creator?.isActive ? [creator] : []), ...students]);
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
