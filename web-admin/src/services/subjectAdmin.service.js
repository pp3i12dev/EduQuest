import api from '../api/axios';

export const subjectAdminService = {
    list: async () => {
        const { data } = await api.get('/subjects');
        return data;
    },
    listGames: async () => {
        const { data } = await api.get('/subjects/games');
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/subjects', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/subjects/${id}`, payload);
        return data;
    },
    setStatus: async (id, isActive) => {
        const { data } = await api.patch(`/subjects/${id}/status`, { isActive });
        return data;
    },
    remove: async (id) => {
        await api.delete(`/subjects/${id}`);
    },
};