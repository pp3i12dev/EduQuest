/* Service worker exclusivo de notificaciones: NO cachea datos privados. */
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = String(payload.title || 'EduQuest').slice(0, 100);
  const body = String(payload.body || 'Tenés una notificación en EduQuest.').slice(0, 240);
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') && !payload.url.startsWith('//')
    ? payload.url : '/dashboard';
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    tag: String(payload.tag || 'eduquest-novedad'), renotify: true,
    data: { url },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const raw = event.notification.data?.url || '/dashboard';
  const target = new URL(raw, self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const clientsOpen = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clientsOpen.find(c => new URL(c.url).origin === self.location.origin);
    if (existing) { await existing.focus(); if ('navigate' in existing) await existing.navigate(target.href); return; }
    await clients.openWindow(target.href);
  })());
});

// Navegación siempre en red. No guardar páginas ni datos académicos en caché.
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate' && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request));
  }
});
