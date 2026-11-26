// Política de conservación del historial de alumnos: en servidor, no en Unity.
// Se aplica tanto al listado como a la operación transaccional de borrado.
export const HISTORY_PROTECTED_LATEST = 5;
export const HISTORY_PROTECTED_DAYS = 7;
const MS_PER_DAY = 86400000;

export function historyDeletionBlockReason(record, protectedIds, now = Date.now()) {
  if (!record?.isCompleted) return 'Solo se pueden borrar actividades finalizadas.';
  if (protectedIds.has(record.id))
    return `Se conservan los últimos ${HISTORY_PROTECTED_LATEST} resultados.`;
  const createdAt = new Date(record.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return 'La fecha del resultado es inválida.';
  if (createdAt > now || now - createdAt < HISTORY_PROTECTED_DAYS * MS_PER_DAY)
    return `Los resultados de los últimos ${HISTORY_PROTECTED_DAYS} días no se pueden borrar.`;
  // Antes de la corrección automática, los puntos por partida eran desconocidos.
  // No adivinar recompensas: sería posible dejar inconsistente el perfil.
  if (!Number.isSafeInteger(record.earnedPoints) || record.earnedPoints < 0)
    return 'Resultado histórico sin puntos verificables: solo puede ocultarse.';
  return null;
}
