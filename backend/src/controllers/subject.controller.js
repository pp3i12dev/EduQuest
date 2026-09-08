import {
    listSubjectsService, createSubjectService, updateSubjectService, deleteSubjectService,
} from '../services/subject.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

export const listSubjects = async (req, res) => {
    try {
        return res.json(await listSubjectsService(req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const createSubject = async (req, res) => {
    try {
        return res.status(201).json(await createSubjectService(req.body, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateSubject = async (req, res) => {
    try {
        return res.json(await updateSubjectService(req.params.id, req.body, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const deleteSubject = async (req, res) => {
    try {
        await deleteSubjectService(req.params.id, req.user);
        return res.status(204).end();
    } catch (error) {
        return handleServiceError(error, res);
    }
};