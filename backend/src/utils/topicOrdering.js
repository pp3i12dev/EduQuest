/**
 * Orden visible 1..N dentro de UNA unidad didáctica.
 * Funciones puras: los tests no necesitan conectarse a PostgreSQL.
 */
const checkPosition = (position, max) => {
  if (!Number.isSafeInteger(position) || position < 1 || position > max) {
    const error = new Error(`La posición debe estar entre 1 y ${max}.`);
    error.status = 400;
    throw error;
  }
};

export function insertTopicId(existingIds, newId, requestedPosition = null) {
  const position = requestedPosition == null ? existingIds.length + 1 : requestedPosition;
  checkPosition(position, existingIds.length + 1);
  if (existingIds.includes(newId)) throw new Error('El tema ya está presente en esta unidad.');
  const next = [...existingIds];
  next.splice(position - 1, 0, newId);
  return next;
}

export function moveTopicId(existingIds, topicId, requestedPosition = null) {
  const index = existingIds.indexOf(topicId);
  if (index === -1) {
    const error = new Error('El tema no pertenece a esta unidad.');
    error.status = 404;
    throw error;
  }
  const position = requestedPosition == null ? index + 1 : requestedPosition;
  checkPosition(position, existingIds.length);
  const next = [...existingIds];
  next.splice(index, 1);
  next.splice(position - 1, 0, topicId);
  return next;
}

export function numberedTopicIds(ids) {
  return ids.map((id, index) => ({ id, position: index + 1 }));
}
