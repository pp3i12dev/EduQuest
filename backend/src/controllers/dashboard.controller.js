import { getDashboardSummaryService } from '../services/dashboard.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

export const getDashboardSummary = async (req, res) => {
    try {
        return res.json(await getDashboardSummaryService(req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};