import api from '../api/axios';

export const institutionService = {
    getMine: async () => {
        const { data } =
            await api.get('/institution');

        return data;
    },

    update: async (payload) => {
        const { data } =
            await api.put('/institution', payload);

        return data;
    },

    list: async () => {
        const { data } =
            await api.get('/institutions');

        return data;
    },

    getById: async (id) => {
        const { data } =
            await api.get(`/institutions/${id}`);

        return data;
    },

    create: async (payload) => {
        const { data } =
            await api.post('/institutions', payload);

        return data;
    },

    updateAdmin: async (id, payload) => {
        const { data } =
            await api.put(
                `/institutions/${id}`,
                payload
            );

        return data;
    },

    toggleStatus: async (id, isActive) => {
        const { data } =
            await api.patch(
                `/institutions/${id}/status`,
                { isActive }
            );

        return data;
    },

    remove: async (id) => {
        await api.delete(`/institutions/${id}`);
    },
};