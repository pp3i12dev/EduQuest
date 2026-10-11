import {
    findTeacherProfileByUserId,
    findTeacherSubjectsByTeacher,
    findTeacherSubjectsByInstitution,
    findTeacherSubjectWithDetails,
    findAssignableActivities,
    findActivitiesByIds,
    applyChanges,
} from '../repositories/teacherSubject.repository.js';
import { uploadFile, deleteFile } from '../config/storage.js';
import {
    MAX_FILE_SIZE_BYTES,
    getExtension,
    isAllowedFile,
    hasValidSignature,
    validateContentName,
} from '../utils/fileValidators.js';

const MANAGER_ROLES = ['DIRECTOR', 'PRECEPTOR'];

const httpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const isManager = (user) => (user.roles ?? []).some((role) => MANAGER_ROLES.includes(role));

const getTeacherProfile = async (userId) => {
    const teacherProfile = await findTeacherProfileByUserId(userId);
    if (!teacherProfile) throw httpError(403, 'El usuario no es profesor');
    return teacherProfile;
};

const getEditableTeacherSubject = async (user, teacherSubjectId) => {
    const teacherSubject = await findTeacherSubjectWithDetails(teacherSubjectId);
    if (!teacherSubject) throw httpError(404, 'La materia no existe');

    if (isManager(user)) {
        if (teacherSubject.subject.institutionId !== user.institutionId) {
            throw httpError(403, 'No tenés permiso para editar esta materia');
        }
        return teacherSubject;
    }

    const teacherProfile = await getTeacherProfile(user.id);
    if (teacherSubject.teacherId !== teacherProfile.id) {
        throw httpError(403, 'No tenés permiso para editar esta materia');
    }
    return teacherSubject;
};

const toIdList = (value, fieldName) => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw httpError(400, `${fieldName} debe ser una lista`);

    const ids = value.map(Number);
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
        throw httpError(400, `${fieldName} contiene ids inválidos`);
    }
    return [...new Set(ids)];
};

export const getTeacherSubjects = async (user) => {
    if (isManager(user)) return findTeacherSubjectsByInstitution(user.institutionId);
    const teacherProfile = await getTeacherProfile(user.id);
    return findTeacherSubjectsByTeacher(teacherProfile.id);
};

export const getTeacherSubjectDetail = (user, teacherSubjectId) =>
    getEditableTeacherSubject(user, teacherSubjectId);

export const getAssignableActivities = async (user, teacherSubjectId) => {
    const teacherSubject = await getEditableTeacherSubject(user, teacherSubjectId);
    return findAssignableActivities(teacherSubject.teacherId);
};

export const editTeacherSubject = async (user, teacherSubjectId, changes = {}, files = []) => {
    const teacherSubject = await getEditableTeacherSubject(user, teacherSubjectId);

    const contentIdsToDelete = toIdList(changes.deletedContentIds, 'deletedContentIds');
    const activityIdsToAdd = toIdList(changes.activityIdsToAdd, 'activityIdsToAdd');
    const activityIdsToRemove = toIdList(changes.activityIdsToRemove, 'activityIdsToRemove');
    const renamedContents = Array.isArray(changes.renamedContents) ? changes.renamedContents : [];

    // --- Contenidos: borrar y renombrar ---
    const currentContents = new Map(teacherSubject.contents.map((c) => [c.id, c]));

    for (const id of contentIdsToDelete) {
        if (!currentContents.has(id)) throw httpError(404, `El contenido ${id} no existe en esta materia`);
    }

    const contentsToRename = [];
    for (const item of renamedContents) {
        const id = Number(item.id);
        const current = currentContents.get(id);
        if (!current) throw httpError(404, `El contenido ${item.id} no existe en esta materia`);
        if (contentIdsToDelete.includes(id)) continue;

        const check = validateContentName(item.name);
        if (!check.ok) throw httpError(400, check.message);

        const extension = getExtension(current.name);
        let base = check.name;
        if (extension && base.toLowerCase().endsWith(extension)) {
            base = base.slice(0, -extension.length).trim();
        }
        if (base.length === 0) throw httpError(400, 'El nombre no puede estar vacío');

        const finalName = `${base}${extension}`;
        if (finalName !== current.name) contentsToRename.push({ id, name: finalName });
    }

    // --- Archivos nuevos ---
    for (const file of files) {
        if (!isAllowedFile(file) || !hasValidSignature(file)) {
            throw httpError(400, `Formato no permitido: ${file.originalname}. Solo PDF o Word`);
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw httpError(400, `El archivo ${file.originalname} supera el tamaño máximo`);
        }
        const check = validateContentName(file.originalname);
        if (!check.ok) throw httpError(400, check.message);
    }

    // --- Juegos (actividades) ---
    if (activityIdsToAdd.some((id) => activityIdsToRemove.includes(id))) {
        throw httpError(400, 'Una actividad no puede agregarse y quitarse a la vez');
    }

    const currentActivityIds = new Set(teacherSubject.activities.map((a) => a.id));
    for (const id of activityIdsToRemove) {
        if (!currentActivityIds.has(id)) throw httpError(400, `La actividad ${id} no está asignada a esta materia`);
    }

    if (activityIdsToAdd.length > 0) {
        const activities = await findActivitiesByIds(activityIdsToAdd);
        if (activities.length !== activityIdsToAdd.length) {
            throw httpError(404, 'Alguna de las actividades no existe');
        }
        for (const activity of activities) {
            if (activity.teacherId !== teacherSubject.teacherId) {
                throw httpError(403, 'Solo podés asignar juegos del docente titular de la materia');
            }
            if (activity.status !== 'ACTIVE') {
                throw httpError(400, `El juego "${activity.title}" no está en funcionamiento`);
            }
            if (activity.teacherSubjectId !== null) {
                throw httpError(409, `El juego "${activity.title}" ya está asignado a una materia`);
            }
        }
    }

    // --- Subir, guardar y limpiar ---
    const uploaded = [];
    try {
        for (const file of files) {
            const { storageKey, url } = await uploadFile(file);
            uploaded.push({
                name: file.originalname.trim(),
                url,
                storageKey,
                mimeType: file.mimetype,
                sizeBytes: file.size,
            });
        }

        await applyChanges(teacherSubjectId, {
            contentsToCreate: uploaded,
            contentsToRename,
            contentIdsToDelete,
            activityIdsToAdd,
            activityIdsToRemove,
        });
    } catch (error) {
        await Promise.allSettled(uploaded.map((u) => deleteFile(u.storageKey)));
        throw error;
    }

    await Promise.allSettled(
        contentIdsToDelete.map((id) => deleteFile(currentContents.get(id).storageKey))
    );

    return findTeacherSubjectWithDetails(teacherSubjectId);
};