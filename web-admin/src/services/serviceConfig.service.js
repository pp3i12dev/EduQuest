import api from '../api/axios';
export const serviceConfigService = {
  summary: async institutionId => (await api.get('/service-config', { params: institutionId ? { institutionId } : {} })).data,
  saveSmtp: async payload => (await api.put('/service-config/smtp', payload)).data,
  testSmtp: async institutionId => (await api.post('/service-config/smtp/test', { institutionId })).data,
  saveGemini: async payload => (await api.put('/service-config/gemini', payload)).data,
  testGemini: async institutionId => (await api.post('/service-config/gemini/test', { institutionId })).data,
  generatePush: async () => (await api.post('/service-config/push/generate', { acceptedConsequences: true })).data,
  regeneratePush: async (confirmation, expectedPublicKey) => (await api.post('/service-config/push/regenerate', { confirmation, expectedPublicKey })).data,
  togglePush: async enabled => (await api.put('/service-config/push', { enabled })).data,
};
