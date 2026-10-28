import activityRepository from '../repositories/activity.repository.js';
import ServiceError from '../utils/ServiceError.js';

class ActivityService {
  async saveDraft(teacherId, activityData) {
    if (!activityData.title || !activityData.content || !activityData.content.statements?.length) {
      throw new ServiceError('La actividad debe tener título y al menos una afirmación.', 400);
    }

    const data = {
      title: activityData.title,
      description: activityData.description || '',
      gameType: 'true_false',
      content: activityData.content, // Formato: { statements: [{ id, text, correctAnswer, order }] }
      teacherId: teacherId,
      status: 'DRAFT',
    };

    if (activityData.id) {
      const existing = await activityRepository.findById(activityData.id);
      if (!existing || existing.teacherId !== teacherId) {
        throw new ServiceError('Actividad no encontrada o sin permisos de edición', 403);
      }
      return await activityRepository.update(activityData.id, data);
    }

    return await activityRepository.create(data);
  }
}

export default new ActivityService();