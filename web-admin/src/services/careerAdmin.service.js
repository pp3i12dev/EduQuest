import api from '../api/axios';

export const careerAdminService = {
    list: async () => {
        const { data } = await api.get('/careers');
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/careers', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/careers/${id}`, payload);
        return data;
    },
    remove: async (id) => {
        await api.delete(`/careers/${id}`);
    },
};