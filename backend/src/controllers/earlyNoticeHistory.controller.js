import { earlyNoticeHistoryService } from '../services/earlyNoticeHistory.service.js';

export const earlyNoticeHistoryController = {
    async getHistory(req, res) {
        try {
            const history = await earlyNoticeHistoryService.getHistory(req.user, req.params.id);
            return res.json(history);
        } catch (error) {
            console.error('[EarlyNoticeHistory]', error);
            const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
                ? error.status : 500;
            return res.status(status).json({
                message: status === 500 ? 'Error interno al consultar el historial' : error.message,
            });
        }
    },
};
