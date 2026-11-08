// URL pública y confiable para los enlaces de registro y verificación.
// Nunca se utiliza req.headers.origin ni req.headers.host como origen de un enlace
// de autenticación: pueden falsificarse desde clientes no navegador.
function normalizeHttpUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const candidate = new URL(value.trim());
    if (!['http:', 'https:'].includes(candidate.protocol) || candidate.username || candidate.password ||
        candidate.search || candidate.hash) return null;
    return candidate.href.replace(/\/$/, '');
  } catch { return null; }
}

export function getFrontendBaseUrl() {
  const configured = String(process.env.FRONTEND_URL || '').trim();
  if (configured) return normalizeHttpUrl(configured); // Error de configuración: no adivinar una URL distinta.

  // El hosting puede tener ya el origen único autorizado en CORS.
  // Solo se usa si es inequívoco, nunca se toma de los headers de la solicitud.
  const knownOrigins = [...new Set(String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',').map(v => v.trim()).filter(Boolean))];
  if (knownOrigins.length === 1) return normalizeHttpUrl(knownOrigins[0]);

  // En el entorno de desarrollo React/Vite utiliza este puerto por defecto.
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:5173';
  return null;
}
