import {
    listAssignmentOptionsService,
    listStudentsForCourseService,
    assignStudentToCourseService,
    removeStudentFromCourseService,
    listTeachersForCourseSubjectService,
    assignTeacherToSubjectService,
    removeTeacherSubjectService,
    listSchedulesService,
    createScheduleService,
    updateScheduleService,
    deleteScheduleService,
} from '../services/assignment.service.js';

import { handleServiceError } from '../utils/handleServiceError.js';

export const listAssignmentOptions = async (req, res) => {
    try {
        return res.json(
            await listAssignmentOptionsService(req.user)
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const listStudentsForCourse = async (req, res) => {
    try {
        return res.json(
            await listStudentsForCourseService(
                req.query.courseId,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const assignStudentToCourse = async (req, res) => {
    try {
        return res.status(201).json(
            await assignStudentToCourseService(
                req.body,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const removeStudentFromCourse = async (req, res) => {
    try {
        await removeStudentFromCourseService(
            req.params.studentId,
            req.params.courseId,
            req.user
        );

        return res.status(204).end();
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const listTeachersForCourseSubject = async (req, res) => {
    try {
        return res.json(
            await listTeachersForCourseSubjectService(
                req.query.courseId,
                req.query.subjectId,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const assignTeacherToSubject = async (req, res) => {
    try {
        return res.status(201).json(
            await assignTeacherToSubjectService(
                req.body,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const removeTeacherSubject = async (req, res) => {
    try {
        await removeTeacherSubjectService(
            req.params.id,
            req.user
        );

        return res.status(204).end();
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const listSchedules = async (req, res) => {
    try {
        return res.json(
            await listSchedulesService(
                req.query.courseId,
                req.query.subjectId,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const createSchedule = async (req, res) => {
    try {
        return res.status(201).json(
            await createScheduleService(
                req.body,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateSchedule = async (req, res) => {
    try {
        return res.json(
            await updateScheduleService(
                req.params.id,
                req.body,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const deleteSchedule = async (req, res) => {
    try {
        await deleteScheduleService(
            req.params.id,
            req.user
        );

        return res.status(204).end();
    } catch (error) {
        return handleServiceError(error, res);
    }
};