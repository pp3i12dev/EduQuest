import api from '../api/axios';

export const courseAdminService = {
    list: async () => {
        const { data } = await api.get('/courses');
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/courses', payload);
        return data;
    },
    update: async (id, payload) => {
        const { data } = await api.put(`/courses/${id}`, payload);
        return data;
    },
    remove: async (id) => {
        await api.delete(`/courses/${id}`);
    },
};