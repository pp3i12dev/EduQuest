import fs from 'node:fs/promises';
import path from 'node:path';
import { getPrisma } from '../config/prisma.js';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');

export async function getOwnedTeacherSubject(userId, teacherSubjectId) {
  return getPrisma().teacherSubject.findFirst({
    where: { id: teacherSubjectId, isActive: true, teacher: { userId } },
    include: {
      subject: { select: { nombre: true } },
      course: { select: { nombre: true, academicYear: true } },
      contents: { select: { id: true, name: true, storageKey: true, mimeType: true, sizeBytes: true } },
    },
  });
}

export async function readOwnedPdf(assignment, documentId) {
  const doc = assignment.contents.find(item => item.id === documentId);
  if (!doc) throw Object.assign(new Error('El PDF no pertenece a esta materia.'), { status: 404 });
  if (doc.mimeType !== 'application/pdf') throw Object.assign(new Error('La generación directa requiere un PDF; los Word deben exportarse como PDF.'), { status: 400 });
  if (doc.sizeBytes > 8 * 1024 * 1024) throw Object.assign(new Error('Por ahora el PDF debe pesar menos de 8 MB.'), { status: 413 });
  // Nunca usamos una URL proporcionada por el usuario para evitar SSRF.
  const safeKey = path.basename(doc.storageKey);
  if (safeKey !== doc.storageKey || !/^[a-f0-9-]{36}\.pdf$/i.test(safeKey)) {
    throw Object.assign(new Error('Referencia de archivo inválida.'), { status: 400 });
  }
  const buffer = await fs.readFile(path.join(uploadsRoot, safeKey));
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') throw Object.assign(new Error('El documento no es un PDF válido.'), { status: 400 });
  return { name: doc.name, buffer };
}

export const createReviewedDraft = ({ teacherId, teacherSubjectId, title, description, gameType, content, topicId }) =>
  getPrisma().activity.create({
    data: { teacherId, teacherSubjectId, topicId, title, description: description || null, gameType, content, status: 'DRAFT' },
  });

export const getOwnedDraft = ({ teacherSubjectId, teacherId, activityId }) =>
  getPrisma().activity.findFirst({ where: { id: activityId, teacherSubjectId, teacherId } });

// Publicar actualiza tanto el estado de juego como los campos de publicación.
export const updateOwnedStatus = (id, status) => getPrisma().activity.update({
  where: { id },
  data: { status, isPublished: status === 'ACTIVE', publishedAt: status === 'ACTIVE' ? new Date() : null },
});

export const updateReviewedDraft = (id, data) => getPrisma().activity.update({
  where: { id }, data,
});
