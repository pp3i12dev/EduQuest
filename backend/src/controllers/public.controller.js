import {
    listInstitutionsService, listCareersByInstitutionService, listCoursesByCareerService,
} from '../services/public.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

export const listInstitutions = async (req, res) => {
    try {
        return res.json(await listInstitutionsService());
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const listCareersByInstitution = async (req, res) => {
    try {
        return res.json(await listCareersByInstitutionService(req.params.institutionId));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const listCoursesByCareer = async (req, res) => {
    try {
        return res.json(await listCoursesByCareerService(req.params.careerId));
    } catch (error) {
        return handleServiceError(error, res);
    }
};