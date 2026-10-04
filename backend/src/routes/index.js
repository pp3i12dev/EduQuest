import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import institutionRoutes from './institution.routes.js';
import careerRoutes from './career.routes.js';
import courseRoutes from './course.routes.js';
import subjectRoutes from './subject.routes.js';
import teacherSubjectRoutes from './teacherSubject.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/institution', institutionRoutes);
router.use('/careers', careerRoutes);
router.use('/courses', courseRoutes);
router.use('/subjects', subjectRoutes);

export default router;