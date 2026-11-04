// EduQuest: reintenta la cola Web Push sin mantener Render permanentemente activo.
// Cloudflare Workers Free ejecuta scheduled() segun el cron configurado.
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      const base = String(env.EDUQUEST_API_URL || '').replace(/\/+$/, '');
      const secret = env.EDUQUEST_QUEUE_SECRET;
      if (!/^https:\/\/[^/]+$/.test(base) || !secret) {
        console.error('Falta configurar EDUQUEST_API_URL o EDUQUEST_QUEUE_SECRET');
        return;
      }
      try {
        const response = await fetch(`${base}/internal/web-push/drain`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
          body: '{}',
          signal: AbortSignal.timeout(110000),
        });
        if (!response.ok) console.error(`EduQuest cola Push: respuesta HTTP ${response.status}`);
      } catch (error) {
        console.error('EduQuest cola Push: fallo en recuperación', String(error));
      }
    })());
  },
};
