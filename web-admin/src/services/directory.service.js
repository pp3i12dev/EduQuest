import api from '../api/axios';
export const directoryService = {
  list: async params => (await api.get('/users/directory', { params })).data,
  institutions: async () => (await api.get('/users/directory/institutions')).data,
  options: async params => (await api.get('/users/directory/options', { params })).data,
  updatePrivacy: async payload => (await api.patch('/users/me/directory-privacy', payload)).data,
};
