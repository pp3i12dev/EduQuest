import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

export const uploadFile = async (file) => {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    const extension = path.extname(file.originalname).toLowerCase();
    const storageKey = `${crypto.randomUUID()}${extension}`;

    await fs.writeFile(path.join(UPLOADS_DIR, storageKey), file.buffer);

    return { storageKey, url: `/uploads/${storageKey}` };
};

export const deleteFile = async (storageKey) => {
    const safeKey = path.basename(storageKey);
    await fs.rm(path.join(UPLOADS_DIR, safeKey), { force: true });
};