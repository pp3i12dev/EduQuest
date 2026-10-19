import { institutionCommunicationRepository as repo } from '../repositories/institutionCommunication.repository.js';

const fail = (message, status = 400) => { const e = new Error(message); e.status = status; throw e; };
const allowedRoles = ['STUDENT', 'TEACHER', 'PRECEPTOR', 'DIRECTOR'];
const allowedActivities = ['PRESENTIAL_CLASSES', 'VIRTUAL_CLASSES', 'EXAMS', 'ADMINISTRATIVE', 'EXTRACURRICULAR'];
const allowedShifts = ['MANANA', 'TARDE', 'NOCHE'];
const allowedReasons = ['HOLIDAY', 'MOURNING', 'WEATHER', 'FACILITIES', 'STRIKE', 'OTHER'];
const intId = value => { const n = Number(value); if (!Number.isSafeInteger(n) || n < 1) fail('ID inválido'); return n; };
const uniqueIds = value => {
  if (!Array.isArray(value)) fail('Se esperaba un arreglo de IDs');
  const ids = value.map(intId); return [...new Set(ids)];
};
const uniqueEnum = (value, allowed, name, nonempty = false) => {
  if (!Array.isArray(value) || (nonempty && !value.length) || value.some(v => !allowed.includes(v))) fail(`${name} inválido`);
  return [...new Set(value)];
};
const isManager = user => user?.isSuperAdmin === true || (user?.roles || []).some(r => ['SUPER_ADMIN', 'DIRECTOR', 'PRECEPTOR'].includes(r));
const canDelete = user => user?.isSuperAdmin === true || (user?.roles || []).some(r => ['SUPER_ADMIN', 'DIRECTOR'].includes(r));
const institution = (user, id) => {
  if (!user?.id) fail('No autenticado', 401);
  const resolved = id == null ? Number(user.institutionId) : intId(id);
  if (!Number.isSafeInteger(resolved) || resolved < 1) fail('Institución requerida');
  if (!user.isSuperAdmin && resolved !== user.institutionId) fail('No autorizado para esta institución', 403);
  return resolved;
};
const date = (value, name) => {
  if (typeof value !== 'string' || !/\d{4}-\d\d-\d\dT\d\d:\d\d/.test(value)) fail(`${name} requiere fecha y hora ISO`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) fail(`${name} inválida`);
  return parsed;
};
const userRoles = u => [
  u.studentProfile && 'STUDENT', u.teacherProfile && 'TEACHER',
  u.preceptorProfile && 'PRECEPTOR', u.directorProfile && 'DIRECTOR',
].filter(Boolean);
const scopeMatches = (user, scope, careerIds, courseIds) => {
  if (scope === 'INSTITUTION') return true;
  const enrollment = [
    ...(user.studentProfile?.courses || []),
    ...(user.teacherProfile?.teacherSubjects || []),
  ];
  if (scope === 'COURSES') return enrollment.some(r => courseIds.includes(r.courseId));
  return enrollment.some(r => careerIds.includes(r.course?.careerId));
};
const audience = (members, data) => members.filter(u =>
  data.roles.some(r => userRoles(u).includes(r)) && scopeMatches(u, data.scope, data.careerIds, data.courseIds)
).map(u => u.id);
const fromRecord = e => ({
  roles: e.audiences.map(x => x.role), scope: e.scope,
  careerIds: e.careers.map(x => x.careerId), courseIds: e.courses.map(x => x.courseId),
});
const normalize = async (body, user, current) => {
  if (!isManager(user)) fail('Solo superusuarios, directivos o preceptores pueden publicar', 403);
  const institutionId = institution(user, current?.institutionId ?? body.institutionId);
  const kind = body.kind;
  if (!['EVENT', 'SUSPENSION'].includes(kind)) fail('Tipo de comunicación inválido');
  const suppliedTitle = String(body.title || '').trim();
  const details = String(body.details || '').trim();
  if (!details || details.length > 10000) fail('Descripción inválida');
  if (kind === 'EVENT' && (!suppliedTitle || suppliedTitle.length > 180)) fail('Título del evento inválido');
  const locationType = kind === 'EVENT' ? (body.locationType || 'INSTITUTION') : null;
  if (kind === 'EVENT' && !['INSTITUTION', 'OTHER'].includes(locationType)) fail('Lugar del evento inválido');
  const venueName = kind === 'EVENT' && locationType === 'OTHER' ? String(body.venueName || '').trim() : null;
  const venueAddress = kind === 'EVENT' && locationType === 'OTHER' ? String(body.venueAddress || '').trim() : null;
  if (locationType === 'OTHER' && (!venueName || !venueAddress || venueName.length > 180 || venueAddress.length > 300)) fail('Ingresá lugar y dirección válidos');
  const startsAt = date(body.startsAt, 'Inicio');
  const endsAt = date(body.endsAt, 'Fin');
  if (startsAt > endsAt) fail('El fin no puede ser anterior al inicio');
  const scope = body.scope;
  if (!['INSTITUTION', 'CAREERS', 'COURSES'].includes(scope)) fail('Alcance inválido');
  const roles = uniqueEnum(body.roles, allowedRoles, 'Roles', true);
  const careerIds = scope === 'CAREERS' ? uniqueIds(body.careerIds) : [];
  const courseIds = scope === 'COURSES' ? uniqueIds(body.courseIds) : [];
  if (scope === 'CAREERS' && !careerIds.length || scope === 'COURSES' && !courseIds.length) fail('Seleccioná al menos una carrera o curso');
  if (careerIds.length && (await repo.careers(institutionId, careerIds)).length !== careerIds.length) fail('Carrera fuera de la institución', 403);
  if (courseIds.length && (await repo.courses(institutionId, courseIds)).length !== courseIds.length) fail('Curso fuera de la institución', 403);
  let suspensionReason = null, affectedActivities = [], affectedShifts = [];
  if (kind === 'SUSPENSION') {
    suspensionReason = body.suspensionReason;
    if (!allowedReasons.includes(suspensionReason)) fail('Motivo de suspensión inválido');
    affectedActivities = uniqueEnum(body.affectedActivities, allowedActivities, 'Actividades afectadas', true);
    affectedShifts = uniqueEnum(body.affectedShifts || [], allowedShifts, 'Turnos');
  }
  // El título es obligatorio en la base, pero para suspensiones se genera automáticamente.
  const suspensionTitles = { HOLIDAY: 'Feriado', MOURNING: 'Duelo', WEATHER: 'Condiciones climáticas', FACILITIES: 'Problemas edilicios', STRIKE: 'Medida de fuerza', OTHER: 'Otro motivo' };
  const title = kind === 'SUSPENSION' ? `Suspensión de actividades · ${suspensionTitles[suspensionReason]}` : suppliedTitle;
  return { institutionId, kind, title, details, startsAt, endsAt, locationType, venueName, venueAddress, scope, roles,
    careerIds, courseIds, suspensionReason, affectedActivities, affectedShifts };
};
const ensureAccess = (user, e) => {
  if (!e || e.deletedAt) fail('Comunicación no encontrada', 404);
  institution(user, e.institutionId);
};

export const institutionCommunicationService = {
  async options(user, institutionId) {
    const id = institution(user, institutionId);
    if (!isManager(user)) fail('No autorizado', 403);
    const { careers, courses, institution: institutionData } = await repo.listOptions(id);
    return { institutionId: id, careers, courses, institution: institutionData, roles: allowedRoles, activities: allowedActivities,
      reasons: allowedReasons, shifts: allowedShifts };
  },
  async list(user, query = {}) {
    const id = institution(user, query.institutionId);
    const events = await repo.list(id);
    if (isManager(user)) return events;
    const members = await repo.members(id);
    const current = members.find(m => m.id === user.id);
    if (!current) return [];
    return events.filter(e => audience([current], fromRecord(e)).includes(user.id));
  },
  async get(user, id) {
    const event = await repo.get(intId(id)); ensureAccess(user, event);
    if (!isManager(user)) {
      const members = await repo.members(event.institutionId);
      const current = members.find(m => m.id === user.id);
      if (!current || !audience([current], fromRecord(event)).includes(user.id)) fail('No autorizado', 403);
    }
    return event;
  },
  async create(user, body) {
    const data = await normalize(body, user);
    const members = await repo.members(data.institutionId);
    return repo.save({ data, actorId: user.id, recipientIds: audience(members, data) });
  },
  async update(user, id, body) {
    const old = await repo.get(intId(id)); ensureAccess(user, old);
    if (!old.isActive) fail('No se puede editar una comunicación cancelada', 409);
    const data = await normalize(body, user, old);
    const members = await repo.members(old.institutionId);
    const previous = new Set(audience(members, fromRecord(old)));
    const next = audience(members, data);
    return repo.save({ old, data, actorId: user.id, recipientIds: next,
      removedRecipientIds: [...previous].filter(id => !next.includes(id)) });
  },
  async cancel(user, id, reason) {
    if (!isManager(user)) fail('No autorizado', 403);
    const old = await repo.get(intId(id)); ensureAccess(user, old);
    if (!old.isActive) fail('Ya está cancelada', 409);
    const explanation = String(reason || '').trim();
    if (explanation.length > 2000) fail('El motivo no puede superar los 2000 caracteres');
    const members = await repo.members(old.institutionId);
    return repo.cancel(old, user.id, explanation, audience(members, fromRecord(old)));
  },
  async removeFromHistory(user, id) {
    if (!canDelete(user)) fail('Solo directivos y superusuarios pueden eliminar del historial', 403);
    const old = await repo.get(intId(id)); ensureAccess(user, old);
    if (old.endsAt > new Date() && old.isActive) fail('Solo se puede eliminar del historial una comunicación finalizada', 409);
    return repo.softDelete(old.id, user.id);
  },
};
