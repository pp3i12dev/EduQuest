export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_NAME_LENGTH = 150;

const ALLOWED_TYPES = {
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export const getExtension = (filename) => {
    const index = filename.lastIndexOf('.');
    return index === -1 ? '' : filename.slice(index).toLowerCase();
};

export const isAllowedFile = (file) => {
    const extension = getExtension(file.originalname);
    const allowedMimes = ALLOWED_TYPES[extension];
    return Boolean(allowedMimes) && allowedMimes.includes(file.mimetype);
};

export const hasValidSignature = (file) => {
    const extension = getExtension(file.originalname);
    const bytes = file.buffer;

    if (extension === '.pdf') return bytes.subarray(0, 5).toString('latin1') === '%PDF-';
    if (extension === '.docx') return bytes[0] === 0x50 && bytes[1] === 0x4b;
    if (extension === '.doc') return bytes[0] === 0xd0 && bytes[1] === 0xcf;
    return false;
};

export const validateContentName = (rawName) => {
    const name = String(rawName ?? '').trim();
    if (name.length === 0) return { ok: false, message: 'El nombre no puede estar vacío' };
    if (name.length > MAX_NAME_LENGTH) {
        return { ok: false, message: `El nombre no puede superar ${MAX_NAME_LENGTH} caracteres` };
    }
    if (/[\\/\u0000-\u001f]/.test(name)) {
        return { ok: false, message: 'El nombre contiene caracteres no permitidos' };
    }
    return { ok: true, name };
};