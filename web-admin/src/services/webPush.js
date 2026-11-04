import api from '../api/axios';

function bytesFromBase64Url(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
export function pushSupport() {
  if (typeof window === 'undefined' || !window.isSecureContext) return { ok: false, reason: 'Necesitás HTTPS para habilitar notificaciones.' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, reason: 'Este navegador no es compatible con Web Push.' };
  }
  const iphone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (iphone && !installed) return { ok: false, reason: 'En iPhone: Compartir → Agregar a Inicio. Abrí EduQuest desde el ícono y activá las notificaciones.' };
  return { ok: true };
}
export async function activatePush() {
  const capability = pushSupport();
  if (!capability.ok) throw new Error(capability.reason);
  if (Notification.permission === 'denied') throw new Error('Las notificaciones están bloqueadas. Habilitalas desde la configuración del dispositivo.');
  // El botón del componente invoca directamente activatePush(); el permiso se solicita por gesto del usuario.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('No se concedió el permiso. Podés activarlo más adelante desde Mi perfil.');
  const { data } = await api.get('/push/config');
  if (!data.enabled || !data.publicKey) throw new Error('El servidor todavía no tiene configuradas las notificaciones Push.');
  const registration = await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();
  if (!sub) sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesFromBase64Url(data.publicKey) });
  try {
    await api.post('/push/subscriptions', { subscription: sub.toJSON() });
  } catch (error) {
    // El navegador puede estar vinculado a una cuenta anterior: no lo transferimos automáticamente.
    throw new Error(error.response?.data?.message || 'No se pudo registrar el dispositivo');
  }
  return sub;
}
export async function currentPushStatus() {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const sub = await registration?.pushManager.getSubscription();
  if (!sub) return false;
  const { data } = await api.post('/push/status', { endpoint: sub.endpoint });
  return Boolean(data.active);
}
export async function deactivatePush() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const sub = await registration?.pushManager.getSubscription();
  if (!sub) return;
  // Primero dejar de enviar en el backend. Si falla, no declarar que quedó desactivado.
  await api.delete('/push/subscriptions', { data: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}
export async function revokePushOnLogout(token) {
  if (!token || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const sub = await registration?.pushManager.getSubscription();
  if (!sub) return;
  // Intentar la revocación en servidor y siempre dejar sin efecto la suscripción local,
  // aun cuando una red inestable impida informar al backend en ese momento.
  try {
    await api.delete('/push/subscriptions', { data: { endpoint: sub.endpoint }, headers: { Authorization: `Bearer ${token}` } });
  } finally {
    await sub.unsubscribe();
  }
}
