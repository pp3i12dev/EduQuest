// Límite básico por IP y ventana, sin dependencias externas.
// En despliegues multinodo reemplazar por un limitador distribuido (Redis/WAF).
const buckets = new Map();
export function passwordResetLimit(req, res, next) {
  const key = String(req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  if (buckets.size > 10000) {
    for (const [ip, item] of buckets) if (item.expires <= now) buckets.delete(ip);
  }
  const current = buckets.get(key);
  const item = !current || current.expires <= now ? { count: 0, expires: now + 15 * 60 * 1000 } : current;
  item.count++;
  buckets.set(key, item);
  if (item.count > 8) return res.status(429).json({ message: 'Demasiados intentos. Probá de nuevo más tarde.' });
  next();
}
