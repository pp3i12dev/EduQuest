import api from '../api/axios';

export const saveActivityDraft = async (activityData) => {
  if (activityData.id) {
    const response = await api.put(`/activities/${activityData.id}`, activityData);
    return response.data;
  }
  const response = await api.post('/activities', activityData);
  return response.data;
};