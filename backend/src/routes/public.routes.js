import { Router } from 'express';
import { listInstitutions, listCareersByInstitution, listCoursesByCareer, listCoursesByInstitution } from '../controllers/public.controller.js';

const router = Router();

router.get('/institutions', listInstitutions);
router.get('/institutions/:institutionId/careers', listCareersByInstitution);
router.get('/institutions/:institutionId/courses', listCoursesByInstitution);
router.get('/careers/:careerId/courses', listCoursesByCareer);

export default router;