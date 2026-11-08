// Límite elemental por IP; independiente del restablecimiento de contraseñas.
// Para campus con IP compartida se permiten hasta 60 acciones en 15 min.
// En producción multinodo complementarlo con WAF/Redis y CAPTCHA anti-bots.
const buckets = new Map();
export function publicRegistrationLimit(req, res, next) {
  const now = Date.now();
  if (buckets.size > 20000) for (const [ip, item] of buckets) if (item.expires <= now) buckets.delete(ip);
  const key = String(req.ip || req.socket?.remoteAddress || 'unknown');
  const item = buckets.get(key) || { count: 0, expires: now + 15 * 60 * 1000 };
  if (item.expires <= now) { item.count = 0; item.expires = now + 15 * 60 * 1000; }
  item.count += 1; buckets.set(key, item);
  if (item.count > 60) return res.status(429).json({ message: 'Demasiadas solicitudes. Volvé a intentar más tarde.' });
  return next();
}
