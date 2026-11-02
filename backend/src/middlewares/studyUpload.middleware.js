import multer from 'multer';
import { MAX_FILE_SIZE_BYTES, isAllowedFile } from '../utils/fileValidators.js';
const middleware = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => cb(null, isAllowedFile(file)),
}).single('file');
export function studyUpload(req, res, next) {
  middleware(req, res, error => {
    if (!error) return next();
    return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Máximo 10 MB por material.' : 'Archivo no admitido.' });
  });
}
