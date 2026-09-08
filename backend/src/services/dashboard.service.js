import * as dashboardRepository from '../repositories/dashboard.repository.js';

export const getDashboardSummaryService = (requester) => {
    return dashboardRepository.countProfilesByInstitution(requester.institutionId);
};