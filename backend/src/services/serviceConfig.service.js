import webpush from 'web-push';
import nodemailer from 'nodemailer';
import { getPrisma } from '../config/prisma.js';
import { encryptSecret, decryptSecret, secretsReady, secretUsable } from '../utils/secretVault.js';

const error = (status, message) => Object.assign(new Error(message), { status });
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const models = /^[A-Za-z0-9_.-]{1,80}$/;
export const VAPID_REGENERATE_CONFIRMATION = 'REGENERAR VAPID Y ANULAR TODAS LAS SUSCRIPCIONES';
// El formato definitivo de una API Key lo verifica Google, no una expresión regular local.
// Admitimos pegar el valor solo, entre comillas o la línea completa del .env.
export function normalizeGeminiApiKey(input) {
  if (input === undefined || input === null || input === '') return '';
  if (typeof input !== 'string') throw error(422, 'La clave API debe ser texto.');
  let result = input.trim();
  const assignment = result.match(/^(?:export\s+)?GEMINI_API_KEY\s*=\s*(.*)$/i);
  if (assignment) result = assignment[1].trim();
  if ((result.startsWith('"') && result.endsWith('"')) ||
      (result.startsWith("'") && result.endsWith("'"))) {
    result = result.slice(1, -1).trim();
  }
  // No adivinamos prefijos ni longitudes de Google: solo rechazamos errores
  // estructurales que impedirían usar una clave. La prueba real es con Gemini.
  if (result.length < 8 || result.length > 2048 || /\s/.test(result) || /[\u0000-\u001f\u007f]/.test(result)) {
    throw error(422, 'Pegá únicamente la clave de Gemini, sin espacios internos ni saltos de línea. También podés pegar GEMINI_API_KEY=... del .env.');
  }
  return result;
}

const isSuper = user => user?.isSuperAdmin === true && user.roles?.includes('SUPER_ADMIN');
const hasRole = (user, role) => user?.roles?.includes(role);

export function assertAdmin(user, { write = false, global = false } = {}) {
  if (!user?.id) throw error(401, 'Necesitás iniciar sesión.');
  if (global && !isSuper(user) && !hasRole(user, 'DIRECTOR')) throw error(403, 'Solo directivos o superadministradores pueden gestionar VAPID.');
  if (!isSuper(user) && !(hasRole(user, 'DIRECTOR') || (!write && hasRole(user, 'PRECEPTOR'))))
    throw error(403, 'No tenés permisos para configurar estos servicios.');
}

export function institutionScope(user, requestedId) {
  assertAdmin(user);
  const id = requestedId == null || requestedId === '' ? Number(user.institutionId) : Number(requestedId);
  if (!Number.isSafeInteger(id) || id <= 0) throw error(400, 'Seleccioná una institución válida.');
  if (!isSuper(user) && id !== Number(user.institutionId)) throw error(403, 'No podés administrar otra institución.');
  return id;
}

export async function getMailSettings(institutionId, { allowDisabled = false } = {}) {
  const id = Number(institutionId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const row = await getPrisma().institutionServiceConfig.findUnique({ where: { institutionId: id } });
  if (!row?.smtpUser || !row?.smtpPasswordEncrypted || (!allowDisabled && !row.smtpEnabled)) return null;
  return {
    user: row.smtpUser,
    password: decryptSecret(row.smtpPasswordEncrypted),
    fromName: row.smtpFromName || 'EduQuest',
    host: row.smtpProvider === 'gmail' ? 'smtp.gmail.com' : null,
    port: 587,
  };
}

export async function mailConfigured(institutionId) {
  const id = Number(institutionId);
  if (!Number.isSafeInteger(id) || id <= 0) return false;
  const row = await getPrisma().institutionServiceConfig.findUnique({ where: { institutionId: id }, select: { smtpUser: true, smtpPasswordEncrypted: true, smtpEnabled: true } });
  return Boolean(row?.smtpEnabled && row.smtpUser && secretUsable(row.smtpPasswordEncrypted));
}

export async function getGeminiSettings(institutionId) {
  const id = Number(institutionId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const row = await getPrisma().institutionServiceConfig.findUnique({ where: { institutionId: id } });
  if (!row?.geminiEnabled || !row.geminiKeyEncrypted) return null;
  return { key: decryptSecret(row.geminiKeyEncrypted), model: row.geminiModel };
}

export async function getServicesSummary(user, requestedInstitutionId) {
  const id = institutionScope(user, requestedInstitutionId);
  const row = await getPrisma().institutionServiceConfig.findUnique({ where: { institutionId: id } });
  const push = await getPrisma().webPushServerConfig.findUnique({ where: { id: 1 }, select: { enabled: true, publicKey: true, privateKeyEncrypted: true, updatedAt: true } });
  const changes = await getPrisma().serviceConfigAudit.findMany({
    where: { action: { in: ['VAPID_GENERATED', 'VAPID_REGENERATED'] } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 40,
    select: { id: true, actorId: true, actorName: true, actorEmail: true, actorRole: true, institutionId: true, action: true, createdAt: true },
  });
  // Compatibilidad con la generación anterior a esta migración, cuando no había snapshot.
  const missingIds = [...new Set(changes.filter(c => !c.actorName).map(c => c.actorId))];
  const historicalUsers = missingIds.length ? await getPrisma().user.findMany({
    where: { id: { in: missingIds } }, select: { id: true, firstName: true, lastName: true, email: true, institutionId: true },
  }) : [];
  const userById = new Map(historicalUsers.map(person => [person.id, person]));
  const history = changes.map(change => {
    const historical = userById.get(change.actorId);
    const sameInstitution = Number(change.institutionId ?? historical?.institutionId) === Number(id);
    return {
      id: change.id, action: change.action, actorId: change.actorId,
      actorName: change.actorName || [historical?.firstName, historical?.lastName].filter(Boolean).join(' ') || `Usuario #${change.actorId}`,
      actorRole: change.actorRole || 'No registrado',
      actorEmail: isSuper(user) || sameInstitution ? (change.actorEmail || historical?.email || null) : null,
      createdAt: change.createdAt,
    };
  });
  return {
    institutionId: id,
    permissions: { canEdit: isSuper(user) || hasRole(user,'DIRECTOR'), canManagePush: isSuper(user) || hasRole(user, 'DIRECTOR') },
    vaultReady: secretsReady(),
    smtp: { configured: Boolean(row?.smtpUser && secretUsable(row.smtpPasswordEncrypted)), needsReconfiguration: Boolean(row?.smtpPasswordEncrypted && !secretUsable(row.smtpPasswordEncrypted)), enabled: Boolean(row?.smtpEnabled), provider: row?.smtpProvider || 'gmail', user: row?.smtpUser || '', fromName: row?.smtpFromName || '' },
    gemini: { configured: secretUsable(row?.geminiKeyEncrypted), needsReconfiguration: Boolean(row?.geminiKeyEncrypted && !secretUsable(row.geminiKeyEncrypted)), enabled: Boolean(row?.geminiEnabled), model: row?.geminiModel || 'gemini-2.5-flash' },
    push: { exists: Boolean(push?.publicKey), configured: Boolean(push?.publicKey && secretUsable(push.privateKeyEncrypted)), needsReconfiguration: Boolean(push?.publicKey && !secretUsable(push.privateKeyEncrypted)), enabled: Boolean(push?.enabled), publicKey: push?.publicKey || null, updatedAt: push?.updatedAt || null, lastGeneration: history[0] || null, history },
  };
}

export async function updateSmtpSettings(user, requestedId, payload = {}) {
  assertAdmin(user, { write: true });
  const institutionId = institutionScope(user, requestedId);
  const provider = String(payload.provider || 'gmail');
  if (provider !== 'gmail') throw error(422, 'Por ahora EduQuest admite Gmail o Google Workspace mediante SMTP.');
  const smtpUser = String(payload.user || '').trim().toLowerCase();
  if (!emailRegex.test(smtpUser) || smtpUser.length > 254) throw error(422, 'Ingresá una dirección de correo válida.');
  const fromName = String(payload.fromName || 'EduQuest').trim().slice(0, 100);
  const password = payload.password;
  const cleanPassword = typeof password === 'string' ? password.replace(/\s+/g, '') : '';
  if (password !== undefined && password !== '' && (!cleanPassword || cleanPassword.length < 8 || cleanPassword.length > 256)) throw error(422, 'Ingresá una contraseña de aplicación válida.');
  const current = await getPrisma().institutionServiceConfig.findUnique({ where: { institutionId } });
  if (!password && !secretUsable(current?.smtpPasswordEncrypted)) throw error(422, 'Ingresá la contraseña de aplicación: no hay una credencial anterior recuperable.');
  if (current?.smtpUser && current.smtpUser !== smtpUser && !password) throw error(422, 'Al cambiar la cuenta de correo, ingresá su contraseña de aplicación.');
  if (!secretsReady()) throw error(503, 'El backend necesita JWT_SECRET para proteger las credenciales de servicios.');
  const data = { smtpProvider: provider, smtpUser, smtpFromName: fromName, smtpEnabled: payload.enabled === true, updatedById: user.id,
    ...(password ? { smtpPasswordEncrypted: encryptSecret(cleanPassword) } : {}) };
  await getPrisma().$transaction(async tx => {
    await tx.institutionServiceConfig.upsert({ where: { institutionId }, create: { institutionId, ...data }, update: data });
    await tx.serviceConfigAudit.create({ data: { actorId: user.id, institutionId, action: 'SMTP_UPDATED' } });
  });
  return getServicesSummary(user, institutionId);
}

export async function updateGeminiSettings(user, requestedId, payload = {}) {
  assertAdmin(user, { write: true });
  const institutionId = institutionScope(user, requestedId);
  const model = String(payload.model || 'gemini-2.5-flash').trim();
  if (!models.test(model)) throw error(422, 'Nombre de modelo inválido.');
  const key = normalizeGeminiApiKey(payload.apiKey);
  const current = await getPrisma().institutionServiceConfig.findUnique({ where: { institutionId } });
  if (!key && !secretUsable(current?.geminiKeyEncrypted)) throw error(422, 'Ingresá la API Key de Gemini: no hay una clave anterior recuperable.');
  if (!secretsReady()) throw error(503, 'El backend necesita JWT_SECRET para proteger las credenciales de servicios.');
  const data = { geminiModel: model, geminiEnabled: payload.enabled === true, updatedById: user.id,
    ...(key ? { geminiKeyEncrypted: encryptSecret(key) } : {}) };
  await getPrisma().$transaction(async tx => {
    await tx.institutionServiceConfig.upsert({ where: { institutionId }, create: { institutionId, ...data }, update: data });
    await tx.serviceConfigAudit.create({ data: { actorId: user.id, institutionId, action: 'GEMINI_UPDATED' } });
  });
  return getServicesSummary(user, institutionId);
}

const lastTests = new Map();
const testLimit = (key) => {
  const now = Date.now();
  if ((lastTests.get(key) || 0) > now) throw error(429, 'Esperá 60 segundos antes de otra prueba.');
  lastTests.set(key, now + 60_000);
};

export async function testSmtpSettings(user, requestedId) {
  assertAdmin(user, { write: true });
  const id = institutionScope(user, requestedId);
  testLimit(`smtp:${user.id}`);
  const config = await getMailSettings(id);
  if (!config?.host) throw error(503, 'Primero guardá y habilitá el correo institucional.');
  const transport = nodemailer.createTransport({ host: config.host, port: config.port, secure: false, auth: { user: config.user, pass: config.password } });
  try {
    await transport.verify();
    await transport.sendMail({ to: user.email, from: { name: config.fromName, address: config.user }, subject: '[EduQuest] Configuración de correo verificada', text: 'EduQuest pudo conectarse a SMTP y el proveedor aceptó este mensaje de prueba.' });
    return { ok: true, message: `El servidor SMTP aceptó el mensaje de prueba enviado a ${user.email}.` };
  } catch { throw error(502, 'No se pudo autenticar o enviar el mensaje SMTP. Revisá usuario y contraseña de aplicación.'); }
  finally { transport.close(); }
}

export async function testGeminiSettings(user, requestedId) {
  assertAdmin(user, { write: true });
  const id = institutionScope(user, requestedId);
  testLimit(`gemini:${user.id}`);
  const config = await getGeminiSettings(id);
  if (!config) throw error(503, 'Primero guardá y habilitá Gemini.');
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 12000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}`, { headers: { 'x-goog-api-key': config.key }, signal: ac.signal });
    if (!response.ok) throw error(502, `Gemini no aceptó la configuración (HTTP ${response.status}).`);
    return { ok: true, message: `La API de Gemini reconoce el modelo ${config.model}. Esto no garantiza cuota para generar actividades.` };
  } catch (e) { if (e.status) throw e; throw error(502, 'No se pudo verificar Gemini. Comprobá la conexión y tu clave API.'); }
  finally { clearTimeout(timeout); }
}

export async function getPushCredentials() {
  const row = await getPrisma().webPushServerConfig.findUnique({ where: { id: 1 } });
  if (!row?.enabled || !row.publicKey || !row.privateKeyEncrypted) return null;
  return { publicKey: row.publicKey, privateKey: decryptSecret(row.privateKeyEncrypted), subject: row.subject };
}

function auditActor(user, action) {
  return {
    actorId: user.id,
    institutionId: Number.isSafeInteger(Number(user.institutionId)) && Number(user.institutionId) > 0 ? Number(user.institutionId) : null,
    actorName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || `Usuario #${user.id}`,
    actorEmail: user.email || null,
    actorRole: isSuper(user) ? 'SUPER_ADMIN' : 'DIRECTOR',
    action,
  };
}

async function invalidateExistingPushSubscriptions(tx) {
  // La clave nueva ya no puede autenticar las suscripciones creadas con la anterior.
  await tx.webPushSubscription.updateMany({ where: { disabledAt: null }, data: { disabledAt: new Date() } });
  await tx.webPushDelivery.updateMany({
    where: { status: { in: ['PENDING', 'PROCESSING'] } },
    data: { status: 'CANCELLED', lastError: 'Claves VAPID renovadas; volver a suscribirse a Web Push.' },
  });
}

export async function generatePushCredentials(user, payload = {}) {
  assertAdmin(user, { global: true });
  if (payload.acceptedConsequences !== true) throw error(422, 'Confirmá que comprendés la permanencia de las claves VAPID y la auditoría.');
  if (!secretsReady()) throw error(503, 'El backend necesita JWT_SECRET para proteger las credenciales de servicios.');
  const keys = webpush.generateVAPIDKeys();
  try {
    await getPrisma().$transaction(async tx => {
      await tx.webPushServerConfig.create({ data: { id: 1, publicKey: keys.publicKey, privateKeyEncrypted: encryptSecret(keys.privateKey), subject: `mailto:${user.email}`, enabled: true } });
      await invalidateExistingPushSubscriptions(tx);
      await tx.serviceConfigAudit.create({ data: auditActor(user, 'VAPID_GENERATED') });
    });
  } catch (e) {
    if (e.code === 'P2002') throw error(409, 'Las claves VAPID ya existen. Actualizá la pantalla antes de continuar.');
    throw e;
  }
  return { ok: true, message: 'Claves VAPID generadas. Quedó registrado quién las creó y cuándo.' };
}

export async function regeneratePushCredentials(user, payload = {}) {
  assertAdmin(user, { global: true });
  if (typeof payload.confirmation !== 'string' || payload.confirmation !== VAPID_REGENERATE_CONFIRMATION)
    throw error(422, 'Escribí exactamente la frase de confirmación indicada.');
  const expectedPublicKey = payload.expectedPublicKey;
  if (typeof expectedPublicKey !== 'string' || expectedPublicKey.length < 20 || expectedPublicKey.length > 512)
    throw error(422, 'Actualizá el estado de Web Push antes de regenerar las claves.');
  if (!secretsReady()) throw error(503, 'El backend necesita JWT_SECRET para proteger las credenciales de servicios.');
  const keys = webpush.generateVAPIDKeys();
  await getPrisma().$transaction(async tx => {
    // Actualización condicional: impide dos regeneraciones simultáneas o sobre una pantalla vieja.
    const result = await tx.webPushServerConfig.updateMany({
      where: { id: 1, publicKey: expectedPublicKey },
      data: { publicKey: keys.publicKey, privateKeyEncrypted: encryptSecret(keys.privateKey), subject: `mailto:${user.email}`, enabled: true },
    });
    if (result.count !== 1) throw error(409, 'El par VAPID cambió desde que abriste la pantalla. Actualizá y revisá el historial.');
    await invalidateExistingPushSubscriptions(tx);
    await tx.serviceConfigAudit.create({ data: auditActor(user, 'VAPID_REGENERATED') });
  });
  return { ok: true, message: 'Claves VAPID regeneradas. Se desactivaron las suscripciones anteriores y se registró la acción.' };
}

export async function togglePushCredentials(user, enabled) {
  assertAdmin(user, { global: true });
  const found = await getPrisma().webPushServerConfig.findUnique({ where: { id: 1 } });
  if (!found) throw error(409, 'Primero generá el par VAPID.');
  if (!secretUsable(found.privateKeyEncrypted)) throw error(409, 'La clave VAPID existente no se puede descifrar. Solo la regeneración excepcional puede reemplazarla.');
  await getPrisma().$transaction(async tx => {
    await tx.webPushServerConfig.update({ where: { id: 1 }, data: { enabled: enabled === true } });
    await tx.serviceConfigAudit.create({ data: auditActor(user, enabled === true ? 'VAPID_ENABLED' : 'VAPID_DISABLED') });
  });
  return { ok: true, enabled: enabled === true };
}
