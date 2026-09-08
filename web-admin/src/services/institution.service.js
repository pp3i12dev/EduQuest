import api from '../api/axios';

export const institutionService = {
    getMine: async () => {
        const { data } = await api.get('/institution');
        return data;
    },
    update: async (payload) => {
        const { data } = await api.put('/institution', payload);
        return data;
    },
};