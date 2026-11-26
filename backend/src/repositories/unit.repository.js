import { getPrisma } from '../config/prisma.js';
import { insertTopicId, moveTopicId, numberedTopicIds } from '../utils/topicOrdering.js';

const include = (teacherSubjectId) => ({
  activities: {
    where: { activity: { teacherSubjectId } },
    include: { activity: { select: { id: true, title: true } } },
  },
  topics: {
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    include: {
      activities: { where: { status: { not: 'INACTIVE' } }, select: { id: true, title: true, status: true }, orderBy: { id: 'asc' } },
      materials: { select: { id: true, title: true, originalName: true, mimeType: true, sizeBytes: true, isPublished: true, createdAt: true }, orderBy: { id: 'asc' } },
    },
  },
});

export const findUnitsByTeacherSubject = (teacherSubjectId) =>
  getPrisma().unit.findMany({ where: { teacherSubjectId }, include: include(teacherSubjectId), orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });

export const createUnitWithActivities = ({ teacherSubjectId, title, description }) =>
  getPrisma().unit.create({
    // La unidad ya no se asocia a juegos: los juegos se asocian a Topic.
    data: { title, description, teacherSubjectId },
    include: include(teacherSubjectId),
  });

export const getUnitWithAssignment = id => getPrisma().unit.findUnique({
  where: { id }, select: { id: true, teacherSubjectId: true, teacherSubject: { select: { isActive: true } } },
});
export const getTopicWithUnit = id => getPrisma().topic.findUnique({
  where: { id }, select: { id: true, unitId: true, unit: { select: { teacherSubjectId: true } } },
});

// Serializable evita que dos altas/reordenamientos simultáneos calculen el mismo orden.
// Ante conflicto de concurrencia, Prisma devuelve P2034 y reintentamos con un estado fresco.
async function orderedTransaction(action) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getPrisma().$transaction(action, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error?.code !== 'P2034' || attempt === 2) throw error;
    }
  }
}

async function normalizePositions(tx, unitId, orderedIds) {
  for (const { id, position } of numberedTopicIds(orderedIds)) {
    await tx.topic.update({ where: { id }, data: { position } });
  }
}

export const createTopicRecord = ({ unitId, title, description, position }) =>
  orderedTransaction(async tx => {
    const existing = await tx.topic.findMany({ where: { unitId }, select: { id: true }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    const created = await tx.topic.create({ data: { unitId, title, description, position: existing.length + 1 } });
    const ids = insertTopicId(existing.map(row => row.id), created.id, position);
    await normalizePositions(tx, unitId, ids);
    return tx.topic.findUnique({ where: { id: created.id } });
  });

export const updateTopicRecord = (unitId, topicId, { title, description, position }) =>
  orderedTransaction(async tx => {
    const existing = await tx.topic.findMany({ where: { unitId }, select: { id: true }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    const ids = moveTopicId(existing.map(row => row.id), topicId, position);
    await tx.topic.update({ where: { id: topicId }, data: { title, description } });
    await normalizePositions(tx, unitId, ids);
    return tx.topic.findUnique({ where: { id: topicId } });
  });
