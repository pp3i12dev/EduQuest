import * as academicRepository from '../repositories/academic.repository.js';

export const listInstitutionsService = () => academicRepository.listInstitutions();
export const listCareersByInstitutionService = (institutionId) =>
    academicRepository.listCareersByInstitution(Number(institutionId));
export const listCoursesByCareerService = (careerId) =>
    academicRepository.listCoursesByCareer(Number(careerId));
export const listCoursesByInstitutionService = (institutionId, careerId) =>
  academicRepository.listCoursesByInstitution(Number(institutionId), careerId);
