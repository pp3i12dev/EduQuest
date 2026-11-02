import * as service from '../services/studyMaterial.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';

const wrap = (callback, status = 200) => async (req, res) => {
  try { return res.status(status).json(await callback(req)); }
  catch (error) { return handleServiceError(error, res); }
};
const encodeFilename = name => `UTF-8''${encodeURIComponent(name)}`;
export const list = wrap(req => service.listForTeacher(req.user, req.query.teacherSubjectId));
export const create = wrap(req => service.createForTeacher(req.user, req.body, req.file), 201);
export const publish = wrap(req => service.setPublication(req.user, req.params.id, req.body?.isPublished));
export const downloadTeacher = async (req, res) => download(req, res, 'teacher');
export const downloadStudent = async (req, res) => download(req, res, 'student');
async function download(req, res, audience) {
  try {
    const { buffer, mimeType, name } = await service.getDownload(req.user, req.params.id, audience);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `attachment; filename*=${encodeFilename(name)}`);
    res.send(buffer);
  } catch (error) { handleServiceError(error, res); }
}
