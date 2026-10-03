import {
    getMyInstitutionService,
    updateMyInstitutionService,
    listInstitutionsService,
    getInstitutionService,
    createInstitutionService,
    updateInstitutionAdminService,
    toggleInstitutionStatusService,
    deleteInstitutionService,
} from '../services/institution.service.js';

import { handleServiceError } from '../utils/handleServiceError.js';

export const getMyInstitution = async (req, res) => {
    try {
        return res.json(
            await getMyInstitutionService(req.user)
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateMyInstitution = async (req, res) => {
    try {
        return res.json(
            await updateMyInstitutionService(
                req.body,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const listInstitutions = async (req, res) => {
    try {
        return res.json(
            await listInstitutionsService(req.user)
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const getInstitution = async (req, res) => {
    try {
        return res.json(
            await getInstitutionService(
                req.params.id,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const createInstitution = async (req, res) => {
    try {
        return res.status(201).json(
            await createInstitutionService(
                req.body,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const updateInstitutionAdmin = async (req, res) => {
    try {
        return res.json(
            await updateInstitutionAdminService(
                req.params.id,
                req.body,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const toggleInstitutionStatus = async (
    req,
    res
) => {
    try {
        return res.json(
            await toggleInstitutionStatusService(
                req.params.id,
                req.body.isActive,
                req.user
            )
        );
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const deleteInstitution = async (req, res) => {
    try {
        await deleteInstitutionService(
            req.params.id,
            req.user
        );

        return res.status(204).end();
    } catch (error) {
        return handleServiceError(error, res);
    }
};