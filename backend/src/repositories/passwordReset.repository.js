import { getPrisma } from '../config/prisma.js';

export const findByEmail = (email) => getPrisma().user.findFirst({
  where: { email: { equals: email, mode: 'insensitive' } },
  select: { id: true, email: true },
});

export const createToken = ({ userId, tokenHash, expiresAt }) => getPrisma().$transaction(async (tx) => {
  await tx.passwordResetToken.deleteMany({ where: { userId } });
  return tx.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
});

export const discardToken = (tokenHash) => getPrisma().passwordResetToken.deleteMany({ where: { tokenHash } });

// Reclamo atómico: dos solicitudes concurrentes nunca consumen el mismo token.
export const consumeToken = ({ tokenHash, passwordHash }) => getPrisma().$transaction(async (tx) => {
  const token = await tx.passwordResetToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true, usedAt: true, expiresAt: true } });
  if (!token || token.usedAt || token.expiresAt <= new Date()) return false;
  const updated = await tx.passwordResetToken.updateMany({
    where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (updated.count !== 1) return false;
  await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
  await tx.refreshToken.deleteMany({ where: { userId: token.userId } });
  await tx.passwordResetToken.deleteMany({ where: { userId: token.userId, id: { not: token.id } } });
  return true;
});
