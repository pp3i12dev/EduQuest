import {
    listCareersService, createCareerService, updateCareerService, deleteCareerService,
} from '../services/career.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

export const listCareers = async (req, res) => {
    try {
        return res.json(await listCareersService(req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const createCareer = async (req, res) => {
    try {
        return res.status(201).json(await createCareerService(req.body, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateCareer = async (req, res) => {
    try {
        return res.json(await updateCareerService(req.params.id, req.body, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const deleteCareer = async (req, res) => {
    try {
        await deleteCareerService(req.params.id, req.user);
        return res.status(204).end();
    } catch (error) {
        return handleServiceError(error, res);
    }
};