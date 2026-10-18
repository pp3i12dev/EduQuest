import api from '../api/axios';

// Ajustá solamente esta importación si tu cliente Axios tiene otro nombre.
export const notificationApi = {
    list: (params = {}) => api.get('/notifications', { params }).then(r => r.data),
    unreadCount: () => api.get('/notifications/unread-count').then(r => r.data),
    markRead: (id) => api.patch(`/notifications/${id}/read`).then(r => r.data),
};
