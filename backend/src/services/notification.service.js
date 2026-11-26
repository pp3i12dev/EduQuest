import { notificationRepository as repo } from '../repositories/notification.repository.js';
import { processPendingNotificationEmails } from './notificationEmail.service.js';

const userIdFromJwt = (jwt) => {
    const id = Number(jwt?.id ?? jwt?.userId ?? jwt?.sub);
    if (!Number.isSafeInteger(id) || id <= 0) {
        const error = new Error('Sesión inválida'); error.status = 401; throw error;
    }
    return id;
};

export const notificationService = {
    async publish(notice, { event = null, revision = 1 } = {}) {
        if (!notice.isActive) return 0;
        // Cada transición genera su propio correo. No cancelar correos de etapas
        // anteriores: si el docente confirma rápido, el email PENDING debe salir igual.
        const affected = await repo.findNoticeClasses(notice.id);
        const courseIds = [...new Set(affected.map(c => c.teacherSubject.courseId))];
        if (!courseIds.length) courseIds.push(notice.courseId);
        const allRows = (await Promise.all(courseIds.map(id => repo.findStudentsByCourse(id)))).flat();
        const students = [...new Map(allRows.map(r => r.student.user).map(u => [u.id, u])).values()];
        const [teacher, creator] = await Promise.all([
            repo.findTeacher(notice.teacherUserId),
            repo.findTeacher(notice.createdById),
        ]);
        const managers = [teacher, creator].filter(u => u?.isActive);
        const modalityLabel = { PRESENCIAL: 'Presencial', VIRTUAL_SINCRONA: 'Virtual sincrónica', VIRTUAL_ASINCRONA: 'Virtual asincrónica' };
        const lines = affected.map(c => {
            const d = c.classDate.toISOString().slice(0, 10);
            return `${d} ${c.startTime}-${c.endTime} · ${c.teacherSubject.subject.nombre} · ${c.teacherSubject.course.nombre} · ${modalityLabel[c.modality] || c.modality || 'Modalidad no especificada'}`;
        });
        const base = `${notice.teacherSubject?.teacher?.user?.firstName ?? 'Docente'} ${notice.teacherSubject?.teacher?.user?.lastName ?? ''}`.trim();
        const detail = `${base}\nClases afectadas:\n${lines.join('\n') || 'Consultar aviso'}${notice.virtualMeetingUrl ? `\nVideollamada: ${notice.virtualMeetingUrl}` : ''}${notice.virtualInstructions ? `\nMaterial: ${notice.virtualInstructions}` : ''}`;
        const kinds = { ABSENCE: 'ausencia', LATE_ARRIVAL: 'llegada tarde', ATTENDANCE_CONFIRMED: 'asistencia confirmada', VIRTUAL_SYNCHRONOUS: 'clase virtual sincrónica', VIRTUAL_ASYNCHRONOUS: 'clase virtual asincrónica' };
        const kind = kinds[notice.type] || 'aviso';

        if (event === 'UPDATED') {
            const recipients = [...managers, ...students];
            const warning = notice.status === 'PENDING'
                ? 'PENDIENTE DE CONFIRMACIÓN DOCENTE. Las clases siguen programadas hasta confirmación.\n'
                : '';

            const title = `Aviso temprano actualizado (versión ${revision})`;

            return repo.publish(notice, 'EARLY_NOTICE_UPDATED', title, `${warning}Actualización #${revision} del aviso.\n${detail}`, recipients, revision);
        }
        if (notice.status === 'PENDING') {
            // Los alumnos reciben el aviso provisional, explícitamente etiquetado
            // como PENDIENTE. No implica que la ausencia haya sido confirmada.
            const recipients = [...managers, ...students];
            if (!recipients.length) return 0;

            const title = 'Aviso temprano pendiente de revisión';

            return repo.publish(notice, 'EARLY_NOTICE_PENDING', title, `PENDIENTE DE CONFIRMACIÓN DOCENTE. Las clases siguen programadas hasta confirmación.\n${detail}`, recipients, revision);
        }
        if (notice.status === 'CONFIRMED') {
            const title = 'Aviso temprano confirmado';

            return repo.publish(notice, 'EARLY_NOTICE_CONFIRMED', title, `Se confirmó ${kind}.\n${detail}`, [...managers, ...students], revision);
        }
        if (notice.status === 'REJECTED') {
            // Informar también al alumnado: recibió el aviso provisional y
            // necesita enterarse de que finalmente fue rechazado.
            const recipients = [...managers, ...students];

            const title = 'Aviso temprano rechazado';

            return repo.publish(notice, 'EARLY_NOTICE_REJECTED', title, `Aviso rechazado: las clases continúan según el horario oficial.\n${detail}`, recipients, revision);
        }
        return 0;
    },
    async safePublish(notice, options = {}) {
        try {
            const published = await this.publish(notice, options);
            // Despertar inmediatamente el procesador: no hace falta esperar
            // hasta el siguiente intervalo de 30 segundos.
            if (published > 0) {
                void processPendingNotificationEmails().catch(error => {
                    console.error('[EarlyNotice][EMAIL] Error al activar la cola:', error);
                });
            }
            return published;
        }
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