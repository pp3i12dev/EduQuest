import api from '../api/axios';

export const saveActivityDraft = async (activityData) => {
  if (activityData.id) {
    const response = await api.put(`/activities/${activityData.id}`, activityData);
    return response.data;
  }
  const response = await api.post('/activities', activityData);
  return response.data;
};

export const activityService = {
  list: async () => (await api.get('/activities')).data,
  publish: async (id, teacherSubjectIds) =>
    (await api.patch(`/activities/${id}/status`, { status: 'ACTIVE', teacherSubjectIds })).data,
  unpublish: async id =>
    (await api.patch(`/activities/${id}/status`, { status: 'DRAFT' })).data,
};