import { teacherConfirmationsService } from '../services/teacherConfirmations.service.js';

export const teacherConfirmationsController = {
    async list(req, res) {
        try {
            const result = await teacherConfirmationsService.list(req.user);
            return res.json(result);
        } catch (error) {
            console.error('[TeacherConfirmations]', error);
            const status = Number.isInteger(error.status) ? error.status : 500;
            return res.status(status).json({
                message: status === 500 ? 'Error al consultar solicitudes' : error.message,
            });
        }
    },
};
