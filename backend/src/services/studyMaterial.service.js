import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getPrisma } from '../config/prisma.js';
import { getTeacherSubjectDetail } from './teacherSubject.service.js';
import { findStudent } from '../repositories/student.repository.js';
import { getExtension, hasValidSignature, isAllowedFile } from '../utils/fileValidators.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const root = path.resolve(process.cwd(), 'private_study_materials');
const toId = raw => {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) throw fail(400, 'Identificador inválido.');
  return n;
};

async function permittedAssignment(user, rawId, write = false) {
  const assignment = await getTeacherSubjectDetail(user, toId(rawId));
  if (write && (!assignment.isActive || !assignment.subject.isActive || assignment.subject.deletedAt)) throw fail(409, 'La materia no está vigente.');
  return assignment;
}
async function topicForAssignment(assignment, rawTopicId) {
  const topic = await getPrisma().topic.findFirst({
    where: { id: toId(rawTopicId), unit: { teacherSubjectId: assignment.id } },
    select: { id: true },
  });
  if (!topic) throw fail(403, 'El tema no pertenece a esta materia.');
  return topic;
}
const publicFields = {
  id: true, title: true, originalName: true, mimeType: true, sizeBytes: true,
  isPublished: true, topicId: true, createdAt: true,
};

export async function listForTeacher(user, teacherSubjectId) {
  const assignment = await permittedAssignment(user, teacherSubjectId);
  return getPrisma().studyMaterial.findMany({
    where: { teacherSubjectId: assignment.id }, select: publicFields,
    orderBy: [{ topicId: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function createForTeacher(user, body = {}, file) {
  if (!file) throw fail(400, 'Seleccioná un archivo PDF o Word.');
  if (!isAllowedFile(file) || !hasValidSignature(file)) throw fail(400, 'Archivo no válido: solo PDF, DOC o DOCX auténticos.');
  const assignment = await permittedAssignment(user, body.teacherSubjectId, true);
  const topic = await topicForAssignment(assignment, body.topicId);
  const title = String(body.title || file.originalname).trim();
  if (!title || title.length > 150) throw fail(400, 'El título debe tener hasta 150 caracteres.');
  const published = body.isPublished === true || body.isPublished === 'true';
  const storageKey = `${crypto.randomUUID()}${getExtension(file.originalname)}`;
  await fs.mkdir(root, { recursive: true });
  const filepath = path.join(root, storageKey);
  await fs.writeFile(filepath, file.buffer, { flag: 'wx' });
  try {
    return await getPrisma().studyMaterial.create({
      data: { title, originalName: path.basename(file.originalname), storageKey,
        mimeType: file.mimetype, sizeBytes: file.buffer.length,
        topicId: topic.id, teacherSubjectId: assignment.id, isPublished: published },
      select: publicFields,
    });
  } catch (error) {
    await fs.rm(filepath, { force: true });
    throw error;
  }
}

export async function setPublication(user, rawId, isPublished) {
  if (typeof isPublished !== 'boolean') throw fail(400, 'isPublished debe ser true o false.');
  const id = toId(rawId);
  const record = await getPrisma().studyMaterial.findUnique({ where: { id } });
  if (!record) throw fail(404, 'Material no encontrado.');
  const assignment = await permittedAssignment(user, record.teacherSubjectId, true);
  await topicForAssignment(assignment, record.topicId);
  return getPrisma().studyMaterial.update({ where: { id }, data: { isPublished }, select: publicFields });
}

export async function getDownload(user, rawId, audience) {
  const id = toId(rawId);
  const record = await getPrisma().studyMaterial.findUnique({ where: { id } });
  if (!record) throw fail(404, 'Material no encontrado.');
  if (audience === 'student') {
    if (!record.isPublished) throw fail(404, 'Material no publicado.');
    const student = await findStudent(user.id);
    if (!student) throw fail(403, 'Esta cuenta no tiene perfil de alumno.');
    const currentYear = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric' }).format(new Date()));
    const memberships = student.courses.filter(row => row.course.academicYear === currentYear);
    if (memberships.length !== 1) throw fail(403, 'No existe un único curso vigente para este alumno.');
    const allowed = await getPrisma().teacherSubject.findFirst({
      where: { id: record.teacherSubjectId, courseId: memberships[0].courseId, isActive: true, subject: { isActive: true, deletedAt: null },
        units: { some: { topics: { some: { id: record.topicId } } } } }, select: { id: true },
    });
    if (!allowed) throw fail(403, 'El material no corresponde a tu curso.');
  } else {
    const assignment = await permittedAssignment(user, record.teacherSubjectId);
    await topicForAssignment(assignment, record.topicId);
  }
  // Claves generadas por el servidor, sin rutas proporcionadas por clientes.
  if (!/^[a-f0-9-]{36}\.(pdf|doc|docx)$/.test(record.storageKey)) throw fail(500, 'Referencia de archivo inválida.');
  const buffer = await fs.readFile(path.join(root, record.storageKey)).catch(error => {
    if (error.code === 'ENOENT') throw fail(404, 'El archivo ya no está disponible en el servidor.');
    throw error;
  });
  return { buffer, mimeType: record.mimeType, name: record.originalName };
}
