import { Router } from 'express';
import { listInstitutions, listCareersByInstitution, listCoursesByCareer } from '../controllers/public.controller.js';

const router = Router();

router.get('/institutions', listInstitutions);
router.get('/institutions/:institutionId/careers', listCareersByInstitution);
router.get('/careers/:careerId/courses', listCoursesByCareer);

export default router;