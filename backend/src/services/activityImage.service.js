import { getOwnedTeacherSubject } from '../repositories/aiActivity.repository.js';
import { uploadFile } from '../config/storage.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
export async function uploadDiagram(user, rawAssignmentId, file) {
  const assignmentId = Number(rawAssignmentId);
  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) throw fail(400, 'Materia inválida.');
  const assignment = await getOwnedTeacherSubject(user.id, assignmentId);
  if (!assignment || !assignment.isActive) throw fail(403, 'Solo el docente titular puede subir la ilustración.');
  if (!file || file.buffer.length < 20 || file.buffer.length > 4 * 1024 * 1024) throw fail(400, 'Imagen inválida o mayor a 4 MB.');
  const bytes = file.buffer;
  const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  const ext = (file.originalname.match(/\.(png|jpe?g|webp)$/i)||[])[1]?.toLowerCase();
  if (!ext || !((ext === 'png' && png) || (['jpg','jpeg'].includes(ext) && jpg) || (ext === 'webp' && webp)))
    throw fail(400, 'Usá una imagen PNG, JPG o WEBP válida.');
  const { url } = await uploadFile({ originalname: 'diagram.' + ext, buffer: bytes });
  return { imageUrl: url };
}
