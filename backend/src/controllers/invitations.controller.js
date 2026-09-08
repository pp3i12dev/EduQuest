import {
    listInvitationsService, createInvitationService,
    cancelInvitationService, acceptInvitationService,
} from '../services/invitations.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

export const listInvitations = async (req, res) => {
    try {
        return res.json(await listInvitationsService(req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const createInvitation = async (req, res) => {
    try {
        return res.status(201).json(await createInvitationService(req.body, req.user));
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const cancelInvitation = async (req, res) => {
    try {
        await cancelInvitationService(req.params.id, req.user);
        return res.status(204).end();
    } catch (error) {
        return handleServiceError(error, res);
    }
};

export const acceptInvitation = async (req, res) => {
    try {
        return res.status(201).json(await acceptInvitationService(req.params.token, req.body));
    } catch (error) {
        return handleServiceError(error, res);
    }
};