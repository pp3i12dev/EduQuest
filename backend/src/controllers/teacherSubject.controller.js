import {
    getTeacherSubjects,
    getTeacherSubjectDetail,
    getAssignableActivities,
    editTeacherSubject,
} from '../services/teacherSubject.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

const parseId = (value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        const error = new Error('Id inválido');
        error.status = 400;
        throw error;
    }
    return id;
};

const parseChanges = (raw) => {
    if (!raw) return {};
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        const error = new Error('El campo changes no es un JSON válido');
        error.status = 400;
        throw error;
    }
};

export const listMine = async (req, res) => {
    try {
        return res.json(await getTeacherSubjects(req.user.id));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const getDetail = async (req, res) => {
    try {
        return res.json(await getTeacherSubjectDetail(req.user.id, parseId(req.params.id)));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const listAssignable = async (req, res) => {
    try {
        return res.json(await getAssignableActivities(req.user.id, parseId(req.params.id)));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const edit = async (req, res) => {
    try {
        const changes = parseChanges(req.body?.changes);
        const result = await editTeacherSubject(
            req.user.id,
            parseId(req.params.id),
            changes,
            req.files ?? []
        );
        return res.json(result);
    } catch (error) {
        return handleServiceError(error, res);
    }
};