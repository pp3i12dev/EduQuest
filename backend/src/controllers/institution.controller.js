import { getMyInstitutionService, updateMyInstitutionService } from '../services/institution.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

export const getMyInstitution = async (req, res) => {
    try {
        return res.json(await getMyInstitutionService(req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateMyInstitution = async (req, res) => {
    try {
        return res.json(await updateMyInstitutionService(req.body, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};