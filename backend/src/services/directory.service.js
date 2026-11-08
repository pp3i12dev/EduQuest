import { getPrisma } from '../config/prisma.js';
import { effectiveDirectoryContact, normalizeDirectoryEmail, normalizeDirectoryPhone, sharedDirectoryContact } from '../utils/directoryContact.js';

const STAFF = ['DIRECTOR', 'PRECEPTOR', 'TEACHER'];
const PRIVACY_ROLES = new Set(['SUPER_ADMIN', 'DIRECTOR', 'PRECEPTOR', 'TEACHER', 'STUDENT']);
function bad(message, status = 400) { throw Object.assign(new Error(message), { status }); }
const isSuper = user => user?.isSuperAdmin === true || user?.roles?.includes('SUPER_ADMIN');

function scopedInstitution(requester, queryId) {
  if (isSuper(requester)) {
    const id = Number(queryId || requester.institutionId);
    if (!Number.isSafeInteger(id) || id <= 0) bad('Elegí una institución para consultar su directorio.');
    return id;
  }
  const id = Number(requester.institutionId);
  if (!Number.isSafeInteger(id) || id <= 0) bad('No pertenecés a una institución.', 403);
  if (queryId && Number(queryId) !== id) bad('No podés consultar otras instituciones.', 403);
  return id;
}
const cleanId = (value) => {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) bad('Filtro académico inválido.');
  return n;
};

export async function getDirectoryService(requester, query = {}) {
  const institutionId = scopedInstitution(requester, query.institutionId);
  const role = String(query.role || '').toUpperCase();
  if (role && !STAFF.includes(role)) bad('Rol de directorio inválido.');
  const search = String(query.search || '').trim().slice(0, 100);
  const careerId = cleanId(query.careerId);
  const courseId = cleanId(query.courseId);
  const subjectId = cleanId(query.subjectId);
  const shift = String(query.shift || '').toUpperCase();
  if (shift && !['MANANA','TARDE','NOCHE'].includes(shift)) bad('Turno inválido.');
  const page = Math.min(100, Math.max(1, Number.parseInt(query.page, 10) || 1));
  const size = 20;
  const where = { institutionId, deletedAt: null, isActive: true,
    OR: [ { directorProfile: { isNot: null } }, { preceptorProfile: { isNot: null } }, { teacherProfile: { isNot: null } } ],
  };
  if (role) {
    const key = { DIRECTOR: 'directorProfile', PRECEPTOR: 'preceptorProfile', TEACHER: 'teacherProfile' }[role];
    where[key] = { isNot: null };
  }
  if (search) {
    // Nunca permitimos buscar por email ni teléfono ocultos.
    const words = search.split(/\s+/).filter(Boolean).slice(0, 5);
    where.AND = words.map(word => ({ OR: [
      { firstName: { contains: word, mode: 'insensitive' } },
      { lastName: { contains: word, mode: 'insensitive' } },
    ] }));
  }
  const courseWhere = {};
  if (careerId) courseWhere.course = { ...courseWhere.course, careerId };
  if (courseId) courseWhere.courseId = courseId;
  if (subjectId) courseWhere.subjectId = subjectId;
  if (shift) courseWhere.course = { ...courseWhere.course, shift };
  if (careerId || courseId || subjectId) {
    // Carrera/curso/materia están asociados a asignaciones docentes.
    where.teacherProfile = { is: { teacherSubjects: { some: { ...courseWhere, isActive: true } } } };
  } else if (shift) {
    // El turno sí existe también en el perfil de preceptor.
    where.AND = [...(where.AND || []), { OR: [
      { teacherProfile: { is: { teacherSubjects: { some: { isActive: true, course: { shift } } } } } },
      { preceptorProfile: { is: { shift } } },
    ] }];
  }
  const db = getPrisma();
  const [rows, total] = await Promise.all([
    db.user.findMany({ where, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], skip: (page-1)*size, take: size,
      select: { id: true, firstName: true, lastName: true, email: true, telefono: true,
        directoryContactEmail: true, directoryContactPhone: true,
        directoryEmailRoles: true, directoryPhoneRoles: true,
        directorProfile: { select: { position: true } }, preceptorProfile: { select: { shift: true } },
        teacherProfile: { select: { specialty: true } },
      } }), db.user.count({ where })
  ]);
  // La privacidad se verifica en el servidor, con roles obtenidos del token autenticado.
  // Ni SUPER_ADMIN bypass ni correo/telefono por búsqueda deben anular el consentimiento.
  const viewerRoles = requester?.roles || [];
  return { total, page, pageSize: size, items: rows.map(row => ({
    id: row.id, firstName: row.firstName, lastName: row.lastName,
    roles: [row.directorProfile && 'DIRECTOR', row.preceptorProfile && 'PRECEPTOR', row.teacherProfile && 'TEACHER'].filter(Boolean),
    position: row.directorProfile?.position || null, shift: row.preceptorProfile?.shift || null,
    specialty: row.teacherProfile?.specialty || null,
    ...sharedDirectoryContact(row, viewerRoles),
  })) };
}

export async function updateDirectoryPrivacyService(requester, body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) bad('Datos inválidos.');
  const allowed = ['directoryEmailRoles', 'directoryPhoneRoles', 'directoryContactEmail', 'directoryContactPhone'];
  if (!Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) {
    bad('Solo se permiten los datos compartidos y los controles de privacidad del directorio.');
  }
  const data = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === 'directoryContactEmail') {
      data[key] = normalizeDirectoryEmail(value);
      continue;
    }
    if (key === 'directoryContactPhone') {
      data[key] = normalizeDirectoryPhone(value);
      continue;
    }
    if (!Array.isArray(value) || value.length > PRIVACY_ROLES.size ||
      value.some(role => typeof role !== 'string' || !PRIVACY_ROLES.has(role)) ||
      new Set(value).size !== value.length) {
      bad('Seleccioná roles válidos y sin repeticiones.');
    }
    data[key] = value;
  }
  const db = getPrisma();
  const owner = await db.user.findFirst({ where: { id: requester.id, isActive: true, deletedAt: null }, select: { id: true } });
  if (!owner) bad('No se encontró tu cuenta activa.', 404);
  // Una sola actualización: contacto y privacidad se guardan juntos o no se guardan.
  const updated = await db.user.update({ where: { id: owner.id }, data,
    select: { email: true, telefono: true,
      directoryContactEmail: true, directoryContactPhone: true,
      directoryEmailRoles: true, directoryPhoneRoles: true } });
  const contact = effectiveDirectoryContact(updated);
  return {
    directoryContactEmail: contact.email,
    directoryContactPhone: contact.phone,
    directoryEmailRoles: updated.directoryEmailRoles,
    directoryPhoneRoles: updated.directoryPhoneRoles,
  };
}

export async function getDirectoryFiltersService(requester, query = {}) {
  const institutionId = scopedInstitution(requester, query.institutionId);
  const db = getPrisma();
  const [careers, courses, subjects] = await Promise.all([
    db.career.findMany({ where: { institutionId }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }),
    db.course.findMany({ where: { institutionId }, select: { id: true, nombre: true, careerId: true, shift: true, academicYear: true }, orderBy: [{ academicYear: 'desc' }, { nombre: 'asc' }] }),
    db.subject.findMany({ where: { institutionId, isActive: true, deletedAt: null }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }),
  ]);
  return { careers, courses, subjects };
}

export async function getDirectoryInstitutionsService(requester) {
  if (!isSuper(requester)) bad('Solo superadministración puede listar instituciones.', 403);
  return getPrisma().institution.findMany({ where: { isActive: true }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
}
