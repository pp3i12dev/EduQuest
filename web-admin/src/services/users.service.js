import api from '../api/axios';

export const usersService = {
    staffSignupRequests: async (status = 'PENDING') => {
        const { data } = await api.get('/users/staff-signup-requests', { params: { status } });
        return data;
    },
    reviewStaffSignup: async ({ id, decision, reason }) => {
        const { data } = await api.post('/users/staff-signup-requests/review', { id, decision, reason });
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
    remove: async (role, id, mode = 'archive', confirm = '') => {
        await api.delete(`/users/${id}`, { params: { role, mode }, data: { confirm } });
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