import { uploadDiagram } from '../services/activityImage.service.js';
import { handleServiceError } from '../utils/handleServiceError.js';
export async function upload(req,res) {
  try { return res.status(201).json(await uploadDiagram(req.user,req.body.teacherSubjectId,req.file)); }
  catch(error) { return handleServiceError(error,res); }
}
