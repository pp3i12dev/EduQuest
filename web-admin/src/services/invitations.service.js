import api from '../api/axios';

export const invitationsService = {
    list: async () => {
        const { data } = await api.get('/invitations');
        return data;
    },
    create: async (payload) => {
        const { data } = await api.post('/invitations', payload);
        return data;
    },
    cancel: async (id) => {
        await api.delete(`/invitations/${id}`);
    },
};