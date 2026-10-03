import multer from 'multer';
import { MAX_FILE_SIZE_BYTES, isAllowedFile } from '../utils/fileValidators.js';

const MAX_FILES = 10;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES },
    fileFilter: (req, file, cb) => {
        if (!isAllowedFile(file)) {
            const error = new Error(`Formato no permitido: ${file.originalname}. Solo PDF o Word`);
            error.status = 400;
            return cb(error);
        }
        cb(null, true);
    },
});

const MULTER_MESSAGES = {
    LIMIT_FILE_SIZE: 'Un archivo supera el tamaño máximo permitido',
    LIMIT_FILE_COUNT: `Podés subir hasta ${MAX_FILES} archivos por vez`,
    LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado',
};

export const uploadContents = (req, res, next) => {
    upload.array('files', MAX_FILES)(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            error.status = 400;
            error.message = MULTER_MESSAGES[error.code] ?? error.message;
        }
        next(error);
    });
};