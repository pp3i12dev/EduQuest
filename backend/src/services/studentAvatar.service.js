import { getPrisma } from '../config/prisma.js';

const AVAILABLE_AVATARS = new Set([
  'boy_01', 'boy_02', 'boy_03', 'boy_04', 'boy_05', 'boy_06', 'boy_07', 'boy_08', 'boy_09', 'boy_10',
  'girl_01', 'girl_02', 'girl_03', 'girl_04', 'girl_05', 'girl_06', 'girl_07', 'girl_08', 'girl_09', 'girl_10',
]);
const DEFAULT_AVATAR = 'boy_01';

async function getStudent(userId) {
  const prisma = getPrisma();
  const student = await prisma.studentProfile.findUnique({
    where: { userId: Number(userId) },
    select: { id: true, avatarConfig: { select: { configJson: true } } },
  });
  if (!student) throw Object.assign(new Error('La cuenta no tiene un perfil de alumno'), { status: 403 });
  return student;
}

export async function getMyAvatar(requester) {
  const student = await getStudent(requester.id);
  const stored = student.avatarConfig?.configJson?.avatarId;
  return { avatarId: AVAILABLE_AVATARS.has(stored) ? stored : DEFAULT_AVATAR };
}

export async function updateMyAvatar(requester, body) {
  const avatarId = body?.avatarId;
  if (typeof avatarId !== 'string' || !AVAILABLE_AVATARS.has(avatarId)) {
    throw Object.assign(new Error('Seleccioná uno de los avatares disponibles'), { status: 400 });
  }
  const student = await getStudent(requester.id);
  const prisma = getPrisma();
  const current = student.avatarConfig?.configJson;
  const existingConfig = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
  const configJson = { ...existingConfig, avatarId };
  await prisma.avatarConfig.upsert({
    where: { studentId: student.id },
    create: { studentId: student.id, configJson },
    update: { configJson },
  });
  return { avatarId };
}
