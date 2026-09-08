import {
    listCoursesService, createCourseService, updateCourseService, deleteCourseService,
} from '../services/course.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

export const listCourses = async (req, res) => {
    try {
        return res.json(await listCoursesService(req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const createCourse = async (req, res) => {
    try {
        return res.status(201).json(await createCourseService(req.body, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateCourse = async (req, res) => {
    try {
        return res.json(await updateCourseService(req.params.id, req.body, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const deleteCourse = async (req, res) => {
    try {
        await deleteCourseService(req.params.id, req.user);
        return res.status(204).end();
    } catch (error) {
        return handleServiceError(error, res);
    }
};