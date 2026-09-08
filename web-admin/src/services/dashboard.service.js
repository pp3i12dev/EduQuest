import api from '../api/axios';

export const dashboardService = {
    getSummary: async () => {
        const { data } = await api.get('/dashboard/summary');
        return data;
    },
};