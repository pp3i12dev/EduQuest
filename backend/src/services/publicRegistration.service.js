import { randomBytes, createHash } from 'node:crypto';
import { getPrisma } from '../config/prisma.js';
import { hashPassword } from '../utils/password.js';
import { sendEmailVerificationEmail, sendStaffSignupDecisionEmail } from '../utils/mailer.js';
import { canAnyRole } from '../config/permissions.js';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const bad = (message, status = 400) => { const e = new Error(message); e.status = status; throw e; };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STAFF = ['DIRECTOR', 'PRECEPTOR', 'TEACHER'];
const generic = 'Si existe una cuenta pendiente con ese correo, enviaremos un nuevo enlace de verificación.';
const ttl = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

export function ensureVerificationEmailConfigured() {
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM || !process.env.FRONTEND_URL) {
    bad('El registro no está disponible porque la institución aún no configuró el envío de correos.', 503);
  }
}
export function createVerificationChallenge() {
  const raw = randomBytes(32).toString('hex');
  return { raw, tokenHash: sha256(raw), expiresAt: ttl() };
}
export async function sendVerificationToUser(user, raw) {
  await sendEmailVerificationEmail({ to: user.email, name: user.firstName, token: raw });
}

export async function registerStaffService(data = {}) {
  ensureVerificationEmailConfigured();
  const role = String(data.role || '').toUpperCase();
  if (!STAFF.includes(role)) bad('Seleccioná un rol de personal válido.');
  const email = String(data.email || '').trim().toLowerCase();
  const dni = String(data.dni || '').trim();
  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  const password = data.password;
  const institutionId = Number(data.institutionId);
  const telefono = String(data.telefono || '').trim() || null;
  if (!EMAIL.test(email) || email.length > 254) bad('Ingresá un correo electrónico válido.');
  if (!/^\d{7,12}$/.test(dni) || !firstName || firstName.length > 100 || !lastName || lastName.length > 100)
    bad('Revisá el nombre, apellido y DNI.');
  if (typeof password !== 'string' || password.length < 10 || password.length > 128)
    bad('La contraseña debe tener entre 10 y 128 caracteres.');
  if (!Number.isSafeInteger(institutionId) || institutionId < 1) bad('Elegí una institución.');
  if (telefono && telefono.length > 35) bad('El teléfono es demasiado largo.');
  const db = getPrisma();
  if (!await db.institution.findFirst({ where: { id: institutionId, isActive: true }, select: { id: true } }))
    bad('La institución no está habilitada para nuevas solicitudes.');
  const clash = await db.user.findFirst({ where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { dni }] }, select: { id: true } });
  if (clash) bad('Ya existe una cuenta asociada a estos datos. Usá el acceso existente o consultá a la institución.', 409);
  const challenge = createVerificationChallenge();
  let user;
  try {
    user = await db.user.create({
      data: {
        dni, email, firstName, lastName, telefono, passwordHash: await hashPassword(password),
        institutionId, isActive: false, signupStatus: 'PENDING', requestedRole: role,
        emailVerificationTokens: { create: { tokenHash: challenge.tokenHash, expiresAt: challenge.expiresAt } },
      },
      select: { id: true, email: true, firstName: true },
    });
  } catch (error) {
    if (error?.code === 'P2002') bad('Ya existe una cuenta con el correo o DNI ingresado.', 409);
    throw error;
  }
  try {
    await sendVerificationToUser(user, challenge.raw);
  } catch (error) {
    console.error('[EduQuest] Falló el email de verificación del personal:', error?.message);
    bad('La cuenta se creó, pero no pudimos enviar el correo. Usá «Reenviar verificación».', 503);
  }
  return { message: 'Revisá tu correo para validar la dirección. Después, una autoridad deberá aprobar tu solicitud.' };
}

// No revelar si existe una cuenta. Este endpoint usa un limitador por IP, y
// la cantidad de correos por cuenta está limitada también en base de datos.
export async function resendVerificationService({ email } = {}) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!EMAIL.test(normalized) || normalized.length > 254) bad('Ingresá un correo electrónico válido.');
  const db = getPrisma();
  const user = await db.user.findFirst({
    where: { email: { equals: normalized, mode: 'insensitive' }, emailVerifiedAt: null,
      requestedRole: { in: [...STAFF, 'STUDENT'] }, deletedAt: null, isActive: false },
    select: { id: true, email: true, firstName: true },
  });
  if (!user) return { message: generic };
  ensureVerificationEmailConfigured();
  const recent = await db.emailVerificationToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) } },
    select: { id: true },
  });
  if (recent) return { message: generic };
  const challenge = createVerificationChallenge();
  await db.$transaction(async tx => {
    await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    await tx.emailVerificationToken.create({ data: { userId: user.id, tokenHash: challenge.tokenHash, expiresAt: challenge.expiresAt } });
  });
  try { await sendVerificationToUser(user, challenge.raw); }
  catch (error) {
    console.error('[EduQuest] Reenvío de verificación fallido:', error?.message);
    await db.emailVerificationToken.deleteMany({ where: { tokenHash: challenge.tokenHash } });
  }
  return { message: generic };
}

export async function verifyEmailService({ token } = {}) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) bad('El enlace de verificación no es válido o venció.');
  const hash = sha256(token);
  return getPrisma().$transaction(async tx => {
    const challenge = await tx.emailVerificationToken.findUnique({
      where: { tokenHash: hash }, select: { id: true, userId: true, usedAt: true, expiresAt: true },
    });
    if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date())
      bad('El enlace de verificación no es válido, ya se utilizó o venció.', 409);
    const changed = await tx.emailVerificationToken.updateMany({
      where: { id: challenge.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() },
    });
    if (changed.count !== 1) bad('El enlace ya se utilizó.', 409);
    const user = await tx.user.findUnique({ where: { id: challenge.userId },
      select: { id: true, isActive: true, deletedAt: true, signupStatus: true, requestedRole: true, emailVerifiedAt: true } });
    if (!user || user.deletedAt || user.isActive || user.signupStatus !== 'PENDING' || !user.requestedRole || user.emailVerifiedAt)
      bad('Esta solicitud ya no puede verificarse.', 409);
    const student = user.requestedRole === 'STUDENT';
    await tx.user.update({ where: { id: user.id }, data: {
      emailVerifiedAt: new Date(), ...(student ? { signupStatus: 'APPROVED', isActive: true } : {}),
    } });
    await tx.emailVerificationToken.deleteMany({ where: { userId: user.id, id: { not: challenge.id } } });
    return { status: student ? 'ACTIVE' : 'AWAITING_APPROVAL',
      message: student ? 'Correo confirmado. Tu cuenta ya está activa; podés iniciar sesión.'
        : 'Correo confirmado. Tu solicitud de personal espera aprobación institucional.' };
  });
}

function canReview(requester, role) {
  if (requester.isSuperAdmin || requester.roles?.includes('SUPER_ADMIN')) return true;
  if (role === 'DIRECTOR') return false; // Nadie puede concederse dirección por solicitud propia.
  if (role === 'PRECEPTOR') return requester.roles?.includes('DIRECTOR');
  return canAnyRole(requester.roles, 'teacher:create');
}
function scopedInstitution(requester) {
  return requester.isSuperAdmin || requester.roles?.includes('SUPER_ADMIN') ? {} : { institutionId: Number(requester.institutionId) || -1 };
}
export async function listStaffRequestsService(requester, query = {}) {
  if (!canAnyRole(requester.roles, 'selfSignup:approve')) bad('Acceso denegado.', 403);
  const status = String(query.status || 'PENDING').toUpperCase();
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) bad('Estado inválido.');
  const institutionId = Number(query.institutionId);
  const filterInstitution = requester.isSuperAdmin && Number.isSafeInteger(institutionId) && institutionId > 0
    ? { institutionId } : scopedInstitution(requester);
  const rows = await getPrisma().user.findMany({
    where: { ...filterInstitution, signupStatus: status, requestedRole: { in: STAFF },
      emailVerifiedAt: { not: null }, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, dni: true, email: true, telefono: true,
      requestedRole: true, institutionId: true, institution: { select: { id: true, nombre: true } },
      signupStatus: true, signupReviewedAt: true, signupReviewReason: true, createdAt: true, emailVerifiedAt: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 500,
  });
  return rows.filter(u => canReview(requester, u.requestedRole));
}
export async function reviewStaffService(requester, { id, decision, reason } = {}) {
  if (!canAnyRole(requester.roles, 'selfSignup:approve')) bad('Acceso denegado.', 403);
  const userId = Number(id);
  const choice = String(decision || '').toUpperCase();
  if (!Number.isSafeInteger(userId) || userId < 1 || !['APPROVED', 'REJECTED'].includes(choice)) bad('Solicitud inválida.');
  const why = String(reason || '').trim();
  if (choice === 'REJECTED' && (why.length < 5 || why.length > 500)) bad('Indicá un motivo de rechazo (5 a 500 caracteres).');
  const db = getPrisma();
  const approved = await db.$transaction(async tx => {
    const user = await tx.user.findFirst({ where: { id: userId, ...scopedInstitution(requester),
      requestedRole: { in: STAFF }, emailVerifiedAt: { not: null }, isActive: false,
      signupStatus: 'PENDING', deletedAt: null },
      select: { id: true, firstName: true, email: true, requestedRole: true } });
    if (!user) bad('La solicitud no está disponible o cambió de estado.', 409);
    if (!canReview(requester, user.requestedRole)) bad('No tenés permiso para aprobar este rol.', 403);
    const changed = await tx.user.updateMany({ where: {
      id: user.id, isActive: false, signupStatus: 'PENDING', emailVerifiedAt: { not: null },
    }, data: { signupStatus: choice, signupReviewedById: requester.id, signupReviewedAt: new Date(),
      signupReviewReason: choice === 'REJECTED' ? why : null, isActive: choice === 'APPROVED' } });
    if (changed.count !== 1) bad('La solicitud ya fue procesada.', 409);
    if (choice === 'APPROVED') {
      if (user.requestedRole === 'DIRECTOR') await tx.directorProfile.create({ data: { userId: user.id } });
      if (user.requestedRole === 'PRECEPTOR') await tx.preceptorProfile.create({ data: { userId: user.id, legajoPreceptor: `PRE-AUTO-${user.id}` } });
      if (user.requestedRole === 'TEACHER') await tx.teacherProfile.create({ data: { userId: user.id, legajoTeacher: `DOC-AUTO-${user.id}` } });
    }
    return user;
  });
  if (process.env.SMTP_HOST && process.env.MAIL_FROM) {
    try { await sendStaffSignupDecisionEmail({ to: approved.email, name: approved.firstName,
      status: choice, role: approved.requestedRole, reason: why }); }
    catch (e) { console.warn('[EduQuest] No se entregó la decisión de personal:', e?.message); }
  }
  return { message: choice === 'APPROVED' ? 'Personal autorizado y activado.' : 'Solicitud rechazada.', id: approved.id, status: choice };
}
