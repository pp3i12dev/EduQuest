// Fecha CIVIL de la institución: no depende del huso del servidor Node/Neon.
// Para DateTime @db.Date usar la parte YYYY-MM-DD del ISO en UTC, no una
// conversión a zona horaria (que podría retroceder artificialmente un día).
export const INSTITUTION_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export function institutionToday(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: INSTITUTION_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function institutionDateOf(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw Object.assign(new Error('Fecha inválida'), { status: 400 });
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: INSTITUTION_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function requireCurrentOrFutureDate(value, label = 'La fecha', now = new Date()) {
  const input = value instanceof Date ? institutionDateOf(value) : value;
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw Object.assign(new Error(`${label} no tiene formato válido`), { status: 400 });
  }
  if (input < institutionToday(now)) {
    throw Object.assign(new Error(`${label} no puede ser anterior a hoy (hora de Argentina)`), { status: 400 });
  }
}
