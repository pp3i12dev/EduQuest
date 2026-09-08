import api from '../api/axios';

export const subjectAdminService = {
    list: async () => {
        const { data } = await api.get('/subjects');
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
    remove: async (id) => {
        await api.delete(`/subjects/${id}`);
    },
};