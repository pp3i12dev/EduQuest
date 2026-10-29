import api from '../api/axios';

export const unitService = {
    list: async (teacherSubjectId) => {
        const { data } = await api.get('/units', { params: { teacherSubjectId } });
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/units', payload);
        return data;
    },
};