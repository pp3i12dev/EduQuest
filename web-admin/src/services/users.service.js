import api from '../api/axios';

export const usersService = {
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