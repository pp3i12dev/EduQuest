import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { listCourses, createCourse, updateCourse, deleteCourse } from '../controllers/course.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', listCourses);
router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;