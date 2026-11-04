import { Router } from 'express';

import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import institutionsRoutes from './institutions.routes.js';
import careerRoutes from './career.routes.js';
import courseRoutes from './course.routes.js';
import subjectRoutes from './subject.routes.js';
import teacherSubjectRoutes from './teacherSubject.routes.js';
import assignmentsRoutes from './assignment.routes.js';
import unitRoutes from './unit.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import activityRoutes from './activity.routes.js';
import aiActivityRoutes from './aiActivity.routes.js';
import studyMaterialRoutes from './studyMaterial.routes.js';
import assessmentRoutes from './assessment.routes.js';

// Notificaciones
import notificationRoutes from './notification.routes.js';
import webPushRoutes from './webPush.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

router.use('/institutions', institutionsRoutes);

router.use('/careers', careerRoutes);
router.use('/courses', courseRoutes);
router.use('/subjects', subjectRoutes);
router.use('/teacher-subjects', teacherSubjectRoutes);
router.use('/activities', activityRoutes);
router.use('/ai-activities', aiActivityRoutes);
router.use('/units', unitRoutes);
router.use('/study-materials', studyMaterialRoutes);
router.use('/teacher-assessments', assessmentRoutes);

router.use('/assignments', assignmentsRoutes);
router.use('/dashboard', dashboardRoutes);

// Notificaciones
router.use('/notifications', notificationRoutes);
router.use('/push', webPushRoutes);

export default router;
