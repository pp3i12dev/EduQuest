import api from '../api/axios';

export const aiActivityService = {
  uploadDiagram: async (teacherSubjectId, image) => {
    const form = new FormData();
    form.append('teacherSubjectId', String(teacherSubjectId));
    form.append('image', image);
    return (await api.post('/ai-activities/diagram', form)).data;
  },
  archive: async (id, teacherSubjectId) =>
    (await api.delete(`/ai-activities/activities/${id}`, { data: { teacherSubjectId, confirm: 'ELIMINAR' } })).data,
  preview: async payload => (await api.post('/ai-activities/preview', payload)).data,
  saveDraft: async payload => (await api.post('/ai-activities/drafts', payload)).data,
  editDraft: async (id, payload) => (await api.put(`/ai-activities/drafts/${id}`, payload)).data,
  publish: async (id, teacherSubjectId) =>
    (await api.post(`/ai-activities/drafts/${id}/publish`, { teacherSubjectId })).data,
};
