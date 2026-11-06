import api from '../api/axios';

export const assessmentService = {
  assignments: async () => (await api.get('/teacher-assessments/assignments')).data,
  list: async (assignmentId, { studentId = '', activityId = '', includeArchived = false, page = 1, pageSize = 50 } = {}) =>
    (await api.get(`/teacher-assessments/assignments/${assignmentId}/attempts`,
      { params: { ...(studentId ? { studentId } : {}), ...(activityId ? { activityId } : {}), includeArchived, page, pageSize } })).data,
  filters: async (assignmentId, includeArchived = false) =>
    (await api.get(`/teacher-assessments/assignments/${assignmentId}/filters`, { params: { includeArchived } })).data,
  leaderboard: async (assignmentId, activityId = '') => (await api.get(`/teacher-assessments/assignments/${assignmentId}/leaderboard`, { params: activityId ? { activityId } : {} })).data,
  detail: async id => (await api.get(`/teacher-assessments/attempts/${id}`)).data,
  archive: async (id, archived) => (await api.patch(`/teacher-assessments/attempts/${id}/archive`, { archived })).data,
  remove: async id => (await api.delete(`/teacher-assessments/attempts/${id}`, { data: { confirm: 'BORRAR' } })).data,
};
