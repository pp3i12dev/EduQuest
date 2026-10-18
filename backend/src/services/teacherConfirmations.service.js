import { teacherConfirmationsRepository as repo } from '../repositories/teacherConfirmations.repository.js';

const httpError = (status, message) => Object.assign(new Error(message), { status });

export const teacherConfirmationsService = {
    async list(jwtUser) {
        const id = Number(jwtUser?.id ?? jwtUser?.userId ?? jwtUser?.sub);
        if (!Number.isSafeInteger(id) || id <= 0) {
            throw httpError(401, 'Sesión inválida');
        }
        // Never trust role or institution information coming from the browser/JWT alone.
        const user = await repo.findUser(id);
        if (!user?.isActive) throw httpError(401, 'Usuario inactivo o inexistente');
        if (!user.teacherProfile) throw httpError(403, 'Solo docentes pueden consultar solicitudes');
        if (!user.institutionId) throw httpError(403, 'Docente sin institución');

        const notices = await repo.findPending(user.id, user.institutionId);
        return {
            data: notices.map(({ affectedClasses, ...notice }) => ({
                ...notice,
                classes: affectedClasses,
                classCount: affectedClasses.length,
            })),
            total: notices.length,
        };
    },
};
