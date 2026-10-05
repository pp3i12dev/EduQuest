import api from '../api/axios';

export const teacherSubjectService = {
    getDetail: async (id) => {
        const { data } = await api.get(`/teacher-subjects/${id}`);
        return data;
    },
    listAssignable: async (id) => {
        const { data } = await api.get(`/teacher-subjects/${id}/assignable-activities`);
        return data;
    },
    save: async (id, { changes, files }) => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        formData.append('changes', JSON.stringify(changes));

        const { data } = await api.put(`/teacher-subjects/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    },
};