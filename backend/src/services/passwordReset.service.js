import { randomBytes, createHash } from 'node:crypto';
import { hashPassword } from '../utils/password.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import * as repo from '../repositories/passwordReset.repository.js';

const generic = 'Si el correo pertenece a una cuenta de EduQuest, recibirás instrucciones para recuperar tu contraseña.';
const sha256 = (raw) => createHash('sha256').update(raw).digest('hex');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestPasswordReset({ email } = {}) {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!emailPattern.test(normalized) || normalized.length > 254) {
    const err = new Error('Ingresá un correo electrónico válido.'); err.status = 400; throw err;
  }
  const user = await repo.findByEmail(normalized);
  if (!user) return { message: generic };
  const token = randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await repo.createToken({ userId: user.id, tokenHash, expiresAt });
  try {
    await sendPasswordResetEmail({ to: user.email, token, expiresAt });
  } catch (error) {
    await repo.discardToken(tokenHash);
    console.error('[EduQuest reset] Falló el envío de correo:', error.message);
    // Respuesta indistinguible de la de un correo inexistente.
  }
  return { message: generic };
}

export async function resetPassword({ token, password } = {}) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    const err = new Error('El enlace es inválido o venció. Solicitá uno nuevo.'); err.status = 400; throw err;
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    const err = new Error('La contraseña debe contener entre 10 y 128 caracteres.'); err.status = 400; throw err;
  }
  const passwordHash = await hashPassword(password);
  if (!await repo.consumeToken({ tokenHash: sha256(token), passwordHash })) {
    const err = new Error('El enlace es inválido, ya fue utilizado o venció. Solicitá uno nuevo.'); err.status = 400; throw err;
  }
  return { message: 'Contraseña actualizada. Ya podés iniciar sesión.' };
}
