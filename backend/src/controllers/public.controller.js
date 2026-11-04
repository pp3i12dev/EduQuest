import {
    listInstitutionsService, listCareersByInstitutionService, listCoursesByCareerService, listCoursesByInstitutionService,
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
export const listCoursesByInstitution = async (req, res) => {
  const id = Number(req.params.institutionId);
  const career = req.query.careerId;
  if (!Number.isSafeInteger(id) || id < 1 || (career && career !== 'none' && (!Number.isSafeInteger(Number(career)) || Number(career) < 1))) {
    return res.status(400).json({ message: 'Institución o carrera inválida' });
  }
  try { return res.json(await listCoursesByInstitutionService(id, career)); }
  catch (error) { return handleServiceError(error, res); }
};
