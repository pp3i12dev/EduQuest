import api from '../api/axios';

export const studyMaterialService = {
  list: async teacherSubjectId => (await api.get('/study-materials', { params: { teacherSubjectId } })).data,
  create: async ({ teacherSubjectId, topicId, title, isPublished, file }) => {
    const body = new FormData();
    body.append('teacherSubjectId', String(teacherSubjectId));
    body.append('topicId', String(topicId));
    body.append('title', title);
    body.append('isPublished', String(Boolean(isPublished)));
    body.append('file', file);
    // No establecer Content-Type a mano: el navegador agrega el boundary del multipart.
    return (await api.post('/study-materials', body, { headers: { 'Content-Type': undefined } })).data;
  },
  publish: async (id, isPublished) => (await api.put(`/study-materials/${id}/publish`, { isPublished })).data,
  download: async (material) => {
    const response = await api.get(`/study-materials/${material.id}/file`, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: material.mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = material.originalName || 'material';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },
};
