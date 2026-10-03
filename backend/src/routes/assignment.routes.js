import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';

import {
    listAssignmentOptions,
    listStudentsForCourse,
    assignStudentToCourse,
    removeStudentFromCourse,
    listTeachersForCourseSubject,
    assignTeacherToSubject,
    removeTeacherSubject,
    listSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
} from '../controllers/assignment.controller.js';

const router = Router();

router.use(authenticate);

router.get('/options', listAssignmentOptions);

router.get('/students', listStudentsForCourse);
router.post('/students', assignStudentToCourse);
router.delete(
    '/students/:studentId/course/:courseId',
    removeStudentFromCourse
);

router.get('/teachers', listTeachersForCourseSubject);
router.post('/teachers', assignTeacherToSubject);
router.delete('/teachers/:id', removeTeacherSubject);

router.get('/schedules', listSchedules);
router.post('/schedules', createSchedule);
router.put('/schedules/:id', updateSchedule);
router.delete('/schedules/:id', deleteSchedule);

export default router;