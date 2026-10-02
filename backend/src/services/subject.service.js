import { canAnyRole } from '../config/permissions.js';
import * as subjectRepository from '../repositories/subject.repository.js';

const AVAILABLE_GAMES = [{ id: 'pig_game', nombre: 'Pig Game' }];

class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function assertPermission(roles) {
    if (!canAnyRole(roles, 'subject:manage')) {
        throw new ServiceError('No tenés permisos para esta acción', 403);
    }
}

export const listSubjectsService = (requester) => {
    assertPermission(requester.roles);
    return subjectRepository.listSubjects(requester.institutionId);
};

export const listSubjectGamesService = (requester) => {
    assertPermission(requester.roles);
    return AVAILABLE_GAMES;
};

export const createSubjectService = async (body, requester) => {
    assertPermission(requester.roles);
    const { nombre, teacherId, courseId, moduleTitle, gameType } = body;
    if (!nombre || !teacherId || !courseId || !moduleTitle?.trim() || !gameType) {
        throw new ServiceError('Completá el nombre, docente, curso, módulo y juego', 400);
    }
    if (!AVAILABLE_GAMES.some((game) => game.id === gameType)) {
        throw new ServiceError('El juego seleccionado no está disponible', 400);
    }

    const subject = await subjectRepository.createSubject({
        nombre: nombre.trim(),
        institutionId: requester.institutionId,
        teacherId: Number(teacherId),
        courseId: Number(courseId),
        moduleTitle: moduleTitle.trim(),
        gameType,
    });
    if (!subject) throw new ServiceError('El docente o curso no pertenece a la institución', 400);
    return subject;
};

export const updateSubjectService = async (id, body, requester) => {
    assertPermission(requester.roles);
    const { nombre } = body;
    if (!nombre) throw new ServiceError('Falta el nombre de la materia', 400);

    try {
        return await subjectRepository.updateSubject(Number(id), requester.institutionId, { nombre });
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Materia no encontrada', 404);
        throw error;
    }
};

export const deleteSubjectService = async (id, requester) => {
    assertPermission(requester.roles);
    try {
        await subjectRepository.deleteSubject(Number(id), requester.institutionId);
    } catch (error) {
        if (error.code === 'P2025') throw new ServiceError('Materia no encontrada', 404);
        if (error.code === 'P2003') throw new ServiceError('No se puede eliminar: está asignada a docentes', 409);
        throw error;
    }
};