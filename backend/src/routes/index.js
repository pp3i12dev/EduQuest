import { Router } from 'express';

import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import institutionsRoutes from './institutions.routes.js';
import careerRoutes from './career.routes.js';
import courseRoutes from './course.routes.js';
import subjectRoutes from './subject.routes.js';
import assignmentsRoutes from './assignment.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);


router.use('/institutions', institutionsRoutes);

router.use('/careers', careerRoutes);
router.use('/courses', courseRoutes);
router.use('/subjects', subjectRoutes);

router.use('/assignments', assignmentsRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;