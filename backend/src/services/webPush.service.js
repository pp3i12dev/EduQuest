import webpush from 'web-push';
import { getPrisma } from '../config/prisma.js';

const getId = reqUser => Number(reqUser?.id);
const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };

// No permitir URLs arbitrarias: el envío HTTP desde el servidor a una URL dada por
// el cliente podría convertirse en SSRF. Solo servicios Push de navegadores conocidos.
export const isTrustedPushEndpoint = value => {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
    const h = u.hostname.toLowerCase();
    return h === 'fcm.googleapis.com'
      || h === 'updates.push.services.mozilla.com'
      || h === 'push.services.mozilla.com'
      || h === 'web.push.apple.com'
      || h.endsWith('.push.apple.com')
      || h.endsWith('.notify.windows.com');
  } catch { return false; }
};

const validKey = s => typeof s === 'string' && /^[A-Za-z0-9_-]{15,200}$/.test(s);
const validSubscription = sub => sub && typeof sub === 'object'
  && typeof sub.endpoint === 'string' && sub.endpoint.length < 2048
  && isTrustedPushEndpoint(sub.endpoint)
  && validKey(sub.keys?.p256dh) && validKey(sub.keys?.auth);

export async function saveSubscription(reqUser, sub) {
  if (!webPushConfigured()) fail(503, 'Web Push no está activado o faltan claves VAPID válidas.');
  if (!validSubscription(sub)) fail(400, 'La suscripción Push no es válida o el proveedor es desconocido.');
  const db = getPrisma();
  const userId = getId(reqUser);
  const previous = await db.webPushSubscription.findUnique({ where: { endpoint: sub.endpoint } });
  if (!previous && (await db.webPushSubscription.count({ where: { userId, disabledAt: null } })) >= 30) {
    fail(429, 'Se alcanzó el límite de dispositivos asociados a esta cuenta.');
  }
  // Un navegador activo jamás puede transferirse a otra identidad.
  // Si la cuenta anterior ya lo desvinculó, borramos el registro anterior
  // (y sus entregas históricas) antes de asociarlo a una nueva cuenta,
  // para impedir entregar notificaciones del usuario anterior.
  if (previous && previous.userId !== userId) {
    if (!previous.disabledAt) fail(409, 'Este navegador todavía pertenece a otra cuenta. Cerrá esa sesión y desactivá sus notificaciones.');
    await db.webPushSubscription.delete({ where: { id: previous.id } });
  }
  try {
    return await db.webPushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, disabledAt: null },
      create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userId },
      select: { id: true, createdAt: true, updatedAt: true },
    });
  } catch (error) {
    if (error?.code === 'P2002') fail(409, 'La suscripción ya pertenece a otro dispositivo.');
    throw error;
  }
}
export async function disableSubscription(reqUser, endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) fail(400, 'Endpoint inválido');
  const result = await getPrisma().webPushSubscription.updateMany({
    where: { endpoint, userId: getId(reqUser) }, data: { disabledAt: new Date() },
  });
  return { disabled: result.count > 0 };
}
export async function currentSubscriptionStatus(reqUser, endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) fail(400, 'Endpoint inválido');
  const count = await getPrisma().webPushSubscription.count({
    where: { endpoint, userId: getId(reqUser), disabledAt: null },
  });
  return { active: count > 0 };
}
export async function listSubscriptions(reqUser) {
  return getPrisma().webPushSubscription.findMany({
    where: { userId: getId(reqUser), disabledAt: null },
    select: { id: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' }, take: 30,
  });
}

// Invocar dentro de la MISMA transacción que crea la notificación; jamás antes.
export async function enqueueWebPushForNotification(tx, userId, notificationId) {
  // Durante una instalación por etapas no interrumpir el sistema de avisos
  // si el nuevo módulo aún no está habilitado y migrado.
  if (process.env.WEB_PUSH_ENABLED !== 'true') return;
  const devices = await tx.webPushSubscription.findMany({
    where: { userId, disabledAt: null }, select: { id: true }, take: 30,
  });
  if (!devices.length) return;
  await tx.webPushDelivery.createMany({
    data: devices.map(d => ({ subscriptionId: d.id, notificationId })),
    skipDuplicates: true,
  });
}

let configured = false;
const configure = () => {
  if (configured) return true;
  if (process.env.WEB_PUSH_ENABLED !== 'true') return false;
  const { WEB_PUSH_PUBLIC_KEY: publicKey, WEB_PUSH_PRIVATE_KEY: privateKey, WEB_PUSH_SUBJECT: subject } = process.env;
  if (!publicKey || !privateKey || !subject) return false;
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (error) {
    console.error('[EduQuest][PUSH] Configuración VAPID inválida:', error.message);
    return false;
  }
  return true;
};
export const webPushConfigured = () => configure();

// Prueba autenticada al dispositivo propio, sin generar un aviso académico ficticio.
// "accepted" indica aceptación por el servicio Push; no certifica entrega visual.
const testCooldown = new Map();
export async function sendTestWebPush(reqUser, endpoint) {
  if (!webPushConfigured()) fail(503, 'Web Push no está configurado en el servidor.');
  if (typeof endpoint !== 'string' || !isTrustedPushEndpoint(endpoint)) fail(400, 'Dispositivo inválido.');
  const userId = getId(reqUser);
  const db = getPrisma();
  const device = await db.webPushSubscription.findFirst({
    where: { endpoint, userId, disabledAt: null },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (!device) fail(404, 'Este dispositivo no está registrado para tu usuario.');
  const now = Date.now();
  if ((testCooldown.get(userId) || 0) > now) fail(429, 'Esperá un minuto antes de repetir la prueba.');
  testCooldown.set(userId, now + 60_000);
  try {
    await webpush.sendNotification({
      endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth },
    }, JSON.stringify({
      title: 'EduQuest · Notificación de prueba',
      body: '¡Listo! Tu navegador recibió una prueba. Los avisos escolares usarán este mismo canal.',
      url: '/dashboard', tag: `eduquest-test-${now}`,
    }), { TTL: 300 });
    return { accepted: true, message: 'El servicio Push aceptó el mensaje. Comprobá las notificaciones del dispositivo.' };
  } catch (error) {
    if ([404, 410].includes(error?.statusCode)) {
      await db.webPushSubscription.update({ where: { id: device.id }, data: { disabledAt: new Date() } });
    }
    fail(502, 'El servicio Push rechazó el envío: ' + String(error?.message || 'error').slice(0, 160));
  }
}

// Jamás incluir DNI, motivo médico u otros datos sensibles en pantalla bloqueada.
export function pushPreview(notification) {
  const type = notification.type;
  if (type === 'STUDENT_REGISTRATION_REQUEST') return {
    title: 'EduQuest · Nueva inscripción pendiente',
    body: 'Una solicitud de alumno necesita revisión institucional. Entrá a Gestión de usuarios.',
    url: '/dashboard/students/requests',
  };
  if (type === 'EARLY_NOTICE_PENDING') return {
    title: 'EduQuest · Aviso PROVISIONAL',
    body: 'PENDIENTE DE CONFIRMACIÓN DOCENTE. Las clases siguen programadas hasta recibir confirmación.',
    url: '/dashboard/early-notices',
  };
  if (type === 'EARLY_NOTICE_REJECTED') return {
    title: 'EduQuest · Aviso RECHAZADO',
    body: 'El aviso fue rechazado. Consultá EduQuest para verificar el horario oficial.',
    url: '/dashboard/early-notices',
  };
  if (type === 'EARLY_NOTICE_CONFIRMED') return {
    title: 'EduQuest · Aviso CONFIRMADO',
    body: 'El docente confirmó el aviso. Ingresá a EduQuest para consultar los detalles.',
    url: '/dashboard/early-notices',
  };
  if (type.startsWith('EARLY_NOTICE_')) return {
    title: 'EduQuest · Aviso actualizado',
    body: 'Se modificó un aviso temprano. Consultá su estado actualizado en EduQuest.',
    url: '/dashboard/early-notices',
  };
  return {
    title: notification.type === 'EVENT_CANCELLED' ? 'EduQuest · Comunicación cancelada' : 'EduQuest · Comunicación institucional',
    body: 'Hay novedades de tu institución. Ingresá a EduQuest para consultar la comunicación.',
    url: '/dashboard/institution-communications',
  };
}

// Descartar avisos provisionales obsoletos, pero no omitir confirmaciones/rechazos.
async function isObsolete(db, n) {
  if (n.earlyNoticeId) {
    const notice = await db.earlyNotice.findUnique({ where: { id: n.earlyNoticeId }, select: { isActive: true, status: true } });
    if (!notice?.isActive) return true;
    if (n.type === 'EARLY_NOTICE_PENDING' && notice.status !== 'PENDING') return true;
  }
  if (n.type === 'EVENT_CREATED' || n.type === 'EVENT_UPDATED' || n.type === 'EARLY_NOTICE_UPDATED') {
    return (await db.notification.count({ where: {
      userId: n.userId, createdAt: { gt: n.createdAt },
      ...(n.earlyNoticeId ? { earlyNoticeId: n.earlyNoticeId } : { institutionEventId: n.institutionEventId }),
    } })) > 0;
  }
  return false;
}

let running = false;
let interval = null;
export async function processWebPushQueue() {
  if (running || !webPushConfigured()) return;
  running = true;
  const db = getPrisma();
  try {
    // Reanudar trabajos tomados por un servidor que se apagó.
    await db.webPushDelivery.updateMany({
      where: { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      data: { status: 'PENDING' },
    });
    const candidates = await db.webPushDelivery.findMany({
      where: { status: 'PENDING', attempts: { lt: 3 } },
      select: { id: true }, orderBy: { createdAt: 'asc' }, take: 30,
    });
    for (const { id } of candidates) {
      const claim = await db.webPushDelivery.updateMany({
        where: { id, status: 'PENDING', attempts: { lt: 3 } },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });
      if (!claim.count) continue;
      try {
        const delivery = await db.webPushDelivery.findUnique({
          where: { id }, include: { subscription: true, notification: true },
        });
        if (!delivery || delivery.subscription.disabledAt || await isObsolete(db, delivery.notification)) {
          await db.webPushDelivery.update({ where: { id }, data: { status: 'CANCELLED' } });
          continue;
        }
        const msg = pushPreview(delivery.notification);
        const result = await webpush.sendNotification({
          endpoint: delivery.subscription.endpoint,
          keys: { p256dh: delivery.subscription.p256dh, auth: delivery.subscription.auth },
        }, JSON.stringify({ ...msg, tag: `eduquest-${delivery.notification.id}` }), { TTL: 3600 });
        await db.webPushDelivery.update({ where: { id }, data: { status: 'SENT', sentAt: new Date(), lastError: null } });
      } catch (error) {
        const status = error?.statusCode;
        const gone = status === 404 || status === 410;
        const forbidden = status === 400 || status === 401 || status === 403;
        const attempt = await db.webPushDelivery.findUnique({ where: { id }, select: { attempts: true, subscriptionId: true } });
        if (gone && attempt) await db.webPushSubscription.update({ where: { id: attempt.subscriptionId }, data: { disabledAt: new Date() } });
        await db.webPushDelivery.update({ where: { id }, data: {
          status: gone || forbidden || (attempt?.attempts ?? 3) >= 3 ? 'FAILED' : 'PENDING',
          lastError: String(error?.message || error).slice(0, 500),
        } });
        console.error('[EduQuest][PUSH] Entrega fallida', id, status || error.message);
      }
    }
  } catch (error) { console.error('[EduQuest][PUSH] Error de procesador', error); }
  finally { running = false; }
}
export function startWebPushProcessor() {
  if (process.env.WEB_PUSH_ENABLED !== 'true') {
    console.info('[EduQuest][PUSH] Desactivado hasta configurar VAPID y WEB_PUSH_ENABLED=true'); return;
  }
  if (!webPushConfigured()) { console.warn('[EduQuest][PUSH] Faltan credenciales VAPID válidas'); return; }
  if (interval) return;
  void processWebPushQueue();
  interval = setInterval(() => void processWebPushQueue(), 15000);
  interval.unref?.();
}
export const publicVapidKey = () => webPushConfigured() ? process.env.WEB_PUSH_PUBLIC_KEY : null;
