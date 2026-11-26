import { randomBytes, createCipheriv, createDecipheriv, hkdfSync } from 'node:crypto';

// Compatibilidad: v1 utiliza la antigua clave independiente, si aún existe.
// Nuevas instalaciones: v2 deriva una clave aislada a partir del JWT_SECRET
// que el backend ya necesita. Nunca se transmite al navegador ni se guarda
// en PostgreSQL. No requiere configurar otra variable de entorno.
function legacyKey() {
  const value = String(process.env.SERVICE_CONFIG_ENCRYPTION_KEY || '').trim();
  if (!value) return null;
  const raw = /^[a-f\d]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  return raw.length === 32 ? raw : null;
}

function derivedKey() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (Buffer.byteLength(secret, 'utf8') < 16) {
    const e = new Error('JWT_SECRET no está configurada o es demasiado corta. El backend requiere este secreto para iniciar sesión y proteger credenciales.');
    e.status = 503;
    throw e;
  }
  // HKDF aporta separación de usos: nunca se emplea el JWT_SECRET directamente
  // como clave AES. Se requiere un JWT_SECRET aleatorio y de alta entropía.
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'),
    Buffer.from('EduQuest/InstitutionServices/v2', 'utf8'),
    Buffer.from('aes-256-gcm/institutional-secrets', 'utf8'), 32));
}

function keyFor(version) {
  if (version === 'v1') {
    const raw = legacyKey();
    if (raw) return raw;
    const e = new Error('Esta credencial fue cifrada con la clave antigua. Volvé a cargarla desde Configuración o restaurá temporalmente SERVICE_CONFIG_ENCRYPTION_KEY.');
    e.status = 409;
    throw e;
  }
  if (version === 'v2') return derivedKey();
  throw new Error('Formato de cifrado no compatible.');
}

export const secretsReady = () => {
  try { derivedKey(); return true; } catch { return Boolean(legacyKey()); }
};

export function encryptSecret(value) {
  // Preservar el modo legacy si una instalación existente sigue usando su clave.
  // Sin ella, React puede configurar los servicios normalmente usando v2.
  const version = legacyKey() ? 'v1' : 'v2';
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(version), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${version}.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(value) {
  if (typeof value !== 'string') throw new Error('Secreto no disponible.');
  const parts = value.split('.');
  if (parts.length !== 4 || !['v1', 'v2'].includes(parts[0])) throw new Error('Formato de secreto inválido.');
  const [version, iv, tag, body] = parts;
  const decipher = createDecipheriv('aes-256-gcm', keyFor(version), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
}

export function secretUsable(value) {
  if (!value) return false;
  try { decryptSecret(value); return true; } catch { return false; }
}
