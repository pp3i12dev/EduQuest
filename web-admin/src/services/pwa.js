export function registerEduQuestPwa() {
  if (typeof document !== 'undefined' && !document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement('link'); manifest.rel = 'manifest'; manifest.href = '/manifest.webmanifest';
    document.head.appendChild(manifest);
  }
  document.documentElement.lang = 'es-AR';
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const appleIcon = document.createElement('link'); appleIcon.rel = 'apple-touch-icon'; appleIcon.href = '/icons/icon-192.png'; document.head.appendChild(appleIcon);
  }
  const meta = document.querySelector('meta[name="theme-color"]') || document.createElement('meta');
  meta.name = 'theme-color'; meta.content = '#243a85';
  if (!meta.parentNode) document.head.appendChild(meta);
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .catch(error => console.warn('[EduQuest] Service Worker no disponible', error));
    }, { once: true });
  }
}
