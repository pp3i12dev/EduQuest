import api from '../api/axios';

export const academicService = {
    listCareers: async (institutionId) => {
        const { data } = await api.get(`/public/institutions/${institutionId}/careers`);
        return data;
    },
    listCoursesByCareer: async (careerId) => {
        const { data } = await api.get(`/public/careers/${careerId}/courses`);
        return data;
    },
    listInstitutions: async () => {
        const { data } = await api.get('/public/institutions');
        return data;
    },
};