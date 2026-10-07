import api from '../api/axios';

export const assignmentsService = {
    options: async () => {
        const { data } = await api.get('/assignments/options');
        return data;
    },

    students: async (courseId) => {
        const { data } = await api.get('/assignments/students', {
            params: { courseId },
        });

        return data;
    },

    assignStudent: async (payload) => {
        const { data } = await api.post(
            '/assignments/students',
            payload
        );

        return data;
    },

    removeStudent: async ({ studentId, courseId }) => {
        await api.delete(
            `/assignments/students/${studentId}/course/${courseId}`
        );
    },

    teachers: async (courseId, subjectId) => {
        const { data } = await api.get('/assignments/teachers', {
            params: {
                courseId,
                subjectId,
            },
        });

        return data;
    },

    assignTeacher: async (payload) => {
        const { data } = await api.post(
            '/assignments/teachers',
            payload
        );

        return data;
    },

    removeTeacher: async (id) => {
        await api.delete(`/assignments/teachers/${id}`);
    },

    schedules: async (courseId, subjectId) => {
        const { data } = await api.get('/assignments/schedules', {
            params: {
                courseId,
                subjectId,
            },
        });

        return data;
    },

    createSchedule: async (payload) => {
        const { data } = await api.post(
            '/assignments/schedules',
            payload
        );

        return data;
    },

    updateSchedule: async (id, payload) => {
        const { data } = await api.put(
            `/assignments/schedules/${id}`,
            payload
        );

        return data;
    },

    removeSchedule: async (id) => {
        await api.delete(`/assignments/schedules/${id}`);
    },
};