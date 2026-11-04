import api from '../api/axios';

export const usersService = {
    signupRequests: async (status = 'PENDING', courseId) => {
        const { data } = await api.get('/users/signup-requests', { params: { status, courseId } });
        return data;
    },
    signupCourseGroups: async (status = 'PENDING') => {
        const { data } = await api.get('/users/signup-requests/groups', { params: { status } });
        return data;
    },
    approveSignups: async (ids) => {
        const { data } = await api.post('/users/signup-requests/approve', { ids });
        return data;
    },
    rejectSignups: async (ids, reason) => {
        const { data } = await api.post('/users/signup-requests/reject', { ids, reason });
        return data;
    },
    list: async (role) => {
        const { data } = await api.get('/users', { params: { role } });
        return data;
    },
    create: async (role, payload) => {
        const { data } = await api.post('/users', { ...payload, role });
        return data;
    },
    update: async (role, id, payload) => {
        const { data } = await api.put(`/users/${id}`, payload, { params: { role } });
        return data;
    },
    toggleStatus: async (role, id, isActive) => {
        const { data } = await api.patch(`/users/${id}/status`, { isActive }, { params: { role } });
        return data;
    },
    remove: async (role, id) => {
        await api.delete(`/users/${id}`, { params: { role } });
    },

    getRoles: async (id) => {
        const { data } = await api.get(`/users/${id}/roles`);
        return data;
    },
    updateRoles: async (id, roles) => {
        const { data } = await api.patch(`/users/${id}/roles`, { roles });
        return data;
    },
};