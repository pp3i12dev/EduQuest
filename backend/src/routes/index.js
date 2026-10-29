
import { Router } from 'express';

import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import institutionsRoutes from './institutions.routes.js';
import careerRoutes from './career.routes.js';
import courseRoutes from './course.routes.js';
import subjectRoutes from './subject.routes.js';
import teacherSubjectRoutes from './teacherSubject.routes.js';
import assignmentsRoutes from './assignment.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import gameRoutes from './game.routes.js';

// Notificaciones
import notificationRoutes from './notification.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

router.use('/institutions', institutionsRoutes);

router.use('/careers', careerRoutes);
router.use('/courses', courseRoutes);
router.use('/subjects', subjectRoutes);
router.use('/teacher-subjects', teacherSubjectRoutes);

router.use('/assignments', assignmentsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/games', gameRoutes);

// Notificaciones
router.use('/notifications', notificationRoutes);

export default router;
