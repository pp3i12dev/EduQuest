import api from '../api/axios';

export const unitService = {
  list: async teacherSubjectId => (await api.get('/units', { params: { teacherSubjectId } })).data,
  create: async payload => (await api.post('/units', payload)).data,
  createTopic: async ({ unitId, ...payload }) => (await api.post(`/units/${unitId}/topics`, payload)).data,
  updateTopic: async ({ unitId, topicId, ...payload }) => (await api.put(`/units/${unitId}/topics/${topicId}`, payload)).data,
};
