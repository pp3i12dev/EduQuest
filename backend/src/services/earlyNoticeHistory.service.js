import { earlyNoticeService } from './earlyNotice.service.js';
import { earlyNoticeHistoryRepository as repository } from '../repositories/earlyNoticeHistory.repository.js';

const deny = () => {
    const error = new Error('Aviso no encontrado');
    error.status = 404;
    throw error;
};

export const earlyNoticeHistoryService = {
    async getHistory(jwtUser, rawId) {
        const id = Number(rawId);
        if (!Number.isSafeInteger(id) || id <= 0) {
            const error = new Error('id debe ser un entero positivo');
            error.status = 400;
            throw error;
        }

        // El servicio existente valida sesión, institución, estado y matrícula estudiantil.
        const notice = await earlyNoticeService.getById(jwtUser, id);
        const user = await repository.findUser(jwtUser.id ?? jwtUser.userId ?? jwtUser.sub);
        if (!user || !user.isActive) deny();

        const authority = user.isSuperAdmin || !!user.directorProfile || !!user.preceptorProfile;
        const teacher = !!user.teacherProfile;
        const student = !!user.studentProfile;

        // Un docente sin rol de autoridad solo puede consultar sus propios avisos.
        // Un estudiante sin rol superior solo ve los avisos confirmados de sus cursos.
        if (!authority) {
            if (teacher) {
                if (notice.teacherUserId !== user.id) deny();
            } else if (student) {
                if (notice.status !== 'CONFIRMED') deny();
                const enrolled = await repository.isStudentEnrolled(notice.courseId, user.id);
                if (!enrolled) deny();
            } else {
                deny();
            }
        }

        const [classes, revisions] = await Promise.all([
            repository.findClasses(notice.id),
            repository.findRevisions(notice.id),
        ]);

        return {
            notice: {
                id: notice.id,
                type: notice.type,
                status: notice.status,
                classDate: notice.classDate,
                periodStart: notice.periodStart,
                periodEnd: notice.periodEnd,
                isActive: notice.isActive,
                archivedAt: notice.archivedAt,
            },
            classes,
            revisions,
        };
    },
};
