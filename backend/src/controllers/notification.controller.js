import { notificationService as service } from '../services/notification.service.js';

const run = (res, callback) => Promise.resolve().then(callback)
    .then(data => res.json(data))
    .catch(error => res.status(error.status || 500).json({
        message: error.status ? error.message : 'Error interno de notificaciones',
    }));

export const notificationController = {
    list: (req, res) => run(res, () => service.list(req.user, req.query)),
    unreadCount: (req, res) => run(res, () => service.unreadCount(req.user)),
    markRead: (req, res) => run(res, () => service.markRead(req.user, req.params.id)),
};
