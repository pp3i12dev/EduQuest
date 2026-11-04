import api from '../api/axios';

export const assessmentService = {
  assignments: async () => (await api.get('/teacher-assessments/assignments')).data,
  list: async (assignmentId, { studentId = '', activityId = '', includeArchived = false } = {}) =>
    (await api.get(`/teacher-assessments/assignments/${assignmentId}/attempts`,
      { params: { ...(studentId ? { studentId } : {}), ...(activityId ? { activityId } : {}), includeArchived } })).data,
  detail: async id => (await api.get(`/teacher-assessments/attempts/${id}`)).data,
  archive: async (id, archived) => (await api.patch(`/teacher-assessments/attempts/${id}/archive`, { archived })).data,
  remove: async id => (await api.delete(`/teacher-assessments/attempts/${id}`, { data: { confirm: 'BORRAR' } })).data,
};
