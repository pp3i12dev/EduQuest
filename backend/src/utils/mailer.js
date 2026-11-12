import nodemailer from 'nodemailer';

const ROLE_LABELS = {
  DIRECTOR: 'Directivo', PRECEPTOR: 'Preceptor',
  TEACHER: 'Docente', STUDENT: 'Alumno',
};

import { getPrisma } from '../config/prisma.js';
import { getMailSettings } from '../services/serviceConfig.service.js';
import { getFrontendBaseUrl } from './frontendBaseUrl.js';

// Los enlaces se resuelven exclusivamente desde la URL pública de React (o un
// origen CORS único), nunca desde headers del cliente ni localhost en producción.
const frontendLink = (pathname, { required = false } = {}) => {
  const base = getFrontendBaseUrl();
  if (!base) {
    if (required) throw Object.assign(new Error('Configurá FRONTEND_URL o un único CORS_ALLOWED_ORIGINS válido para generar enlaces de acceso.'), { status: 503 });
    return null;
  }
  return new URL(pathname, base).toString();
};

// No se vuelve a usar SMTP global: cada correo sale por la institución correcta.
// Para registros y recuperación, el usuario destinatario ya existe y permite resolver su institución.
async function sendConfiguredMail({ institutionId, to, from: _ignored, ...message }) {
  let id = Number(institutionId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    const user = await getPrisma().user.findFirst({
      where: { email: { equals: String(to || ''), mode: 'insensitive' }, deletedAt: null },
      select: { institutionId: true },
    });
    id = Number(user?.institutionId);
  }
  const config = await getMailSettings(id);
  if (!config?.host) {
    throw Object.assign(new Error('La institución todavía no configuró un remitente SMTP habilitado.'), { status: 503 });
  }
  const transport = nodemailer.createTransport({
    host: config.host, port: config.port, secure: false,
    auth: { user: config.user, pass: config.password },
  });
  try {
    return await transport.sendMail({ ...message, to, from: { name: config.fromName, address: config.user } });
  } finally {
    transport.close();
  }
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

export const sendInvitationEmail = async ({ to, token, role, expiresAt, institutionId }) => {
  const link = frontendLink(`/aceptar-invitacion/${encodeURIComponent(token)}`, { required: true });
  const roleLabel = ROLE_LABELS[role] ?? role;
  const expires = expiresAt.toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });
  return sendConfiguredMail({
    institutionId,
    to,
    subject: 'Te invitaron a unirte a la plataforma',
    text: `Fuiste invitado como ${roleLabel}.\n\nAceptá la invitación en: ${link}\n\nVence el ${expires}.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px"><h2>Te invitaron a unirte</h2><p>Fuiste invitado como <strong>${escapeHtml(roleLabel)}</strong>.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 20px;background:#9333ea;color:#fff;border-radius:6px;text-decoration:none">Aceptar invitación</a></p><p style="color:#666;font-size:13px">Esta invitación vence el ${escapeHtml(expires)}.</p><p style="color:#666;font-size:13px">Si no esperabas este correo, podés ignorarlo.</p></div>`,
  });
};


const formatDate = (value, options) => value
  ? new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', ...options }).format(new Date(value))
  : 'Fecha no disponible';
const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'No informado';
const hour = (value) => value ? String(value).slice(0, 5) : '—';

const noticeDate = (value) => value
  ? new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
  : '—';

export const sendEarlyNoticeEmail = ({ to, title, message, notificationType, notice }) => {
  const url = frontendLink('/dashboard/early-notices');
  const status = notificationType === 'EARLY_NOTICE_PENDING' ? 'ESPERANDO CONFIRMACIÓN DEL DOCENTE'
    : notificationType === 'EARLY_NOTICE_CONFIRMED' ? 'CONFIRMADO'
    : notificationType === 'EARLY_NOTICE_REJECTED' ? 'RECHAZADO' : 'ACTUALIZACIÓN';
  const color = status === 'CONFIRMADO' ? '#166534' : status === 'RECHAZADO' ? '#991b1b' : '#92400e';
  const background = status === 'CONFIRMADO' ? '#dcfce7' : status === 'RECHAZADO' ? '#fee2e2' : '#fef3c7';
  const teacher = fullName(notice?.teacherSubject?.teacher?.user);
  const creator = fullName(notice?.createdBy);
  const creatorRole = notice?.createdBy?.directorProfile ? 'directivo' : notice?.createdBy?.preceptorProfile ? 'preceptor' : notice?.createdBy?.teacherProfile ? 'docente' : 'usuario';
  const typeNames = { ABSENCE: 'Ausencia', LATE_ARRIVAL: 'Llegada tarde', ATTENDANCE_CONFIRMED: 'Asistencia confirmada', VIRTUAL_SYNCHRONOUS: 'Clase virtual sincrónica', VIRTUAL_ASYNCHRONOUS: 'Clase virtual asincrónica' };
  const kind = typeNames[notice?.type] || 'Aviso temprano';
  const classes = (notice?.affectedClasses?.length ? notice.affectedClasses : notice?.classes?.length ? notice.classes : null) || (notice ? [{
    classDate: notice.classDate, startTime: notice.startTime, endTime: notice.endTime,
    teacherSubject: { subject: notice.subject, course: notice.course },
  }] : []);
  const start = notice?.periodStart || classes[0]?.classDate || notice?.classDate;
  const end = notice?.periodEnd || classes[classes.length - 1]?.classDate || notice?.classDate;
  const period = start && end && new Date(start).getTime() !== new Date(end).getTime()
    ? `Del ${noticeDate(start)} al ${noticeDate(end)} (inclusive)` : noticeDate(start);
  const rows = classes.map((item) => ({
    date: noticeDate(item.classDate),
    time: `${hour(item.startTime)} a ${hour(item.endTime)}`,
    subject: item.teacherSubject?.subject?.nombre || notice?.subject?.nombre || 'Materia no especificada',
    course: item.teacherSubject?.course?.nombre || notice?.course?.nombre || 'Curso no especificado',
  }));
  const summary = `${kind} del docente ${teacher}. Período: ${period}. ${rows.length} clase${rows.length === 1 ? '' : 's'} afectada${rows.length === 1 ? '' : 's'}.`;
  const wasPendingUpdate = notificationType === 'EARLY_NOTICE_UPDATED'
    && String(message || '').includes('PENDIENTE DE CONFIRMACIÓN DOCENTE');
  const caution = (status === 'ESPERANDO CONFIRMACIÓN DEL DOCENTE' || wasPendingUpdate)
    ? 'INFORMACIÓN PROVISORIA: el docente todavía no confirmó el aviso. Las clases continúan oficialmente programadas hasta su confirmación.'
    : status === 'RECHAZADO' ? 'El docente rechazó el aviso. Las clases continúan según el horario oficial.' : '';
  // El motivo puede contener datos médicos o personales. No se incluye en correos a estudiantes.
  const generated = notice ? `Generado por ${creatorRole} ${creator} el ${formatDate(notice.createdAt, { dateStyle: 'long', timeStyle: 'short' })}.` : '';
  const lines = rows.map((r) => `${r.date} | ${r.time} | ${r.subject} | ${r.course}`);
  const text = `${status}\n\n${summary}\n\nClases afectadas:\n${lines.join('\n') || 'Consultar EduQuest'}\n\n${generated}\n${caution}\n\n${url ? `Consultá EduQuest: ${url}` : 'Consultá el aviso en EduQuest.'}`;
  const tableRows = rows.map((r) => `<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.date)}</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.time)}</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.subject)}</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.course)}</td></tr>`).join('');
  const html = `<div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:760px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"><div style="background:#173c78;padding:22px;color:#fff"><b>EduQuest · Avisos Tempranos</b><h2 style="color:#fff;margin:10px 0 0">${escapeHtml(title)}</h2></div><div style="padding:24px"><div style="background:${background};color:${color};font-weight:bold;font-size:18px;padding:16px;border-radius:8px;text-align:center">${escapeHtml(status)}</div><p style="font-size:16px;line-height:1.7">${escapeHtml(summary)}</p><h3 style="font-size:16px">Clases afectadas (${rows.length})</h3><div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:13px"><thead><tr style="background:#e2e8f0"><th style="padding:10px;text-align:left">Fecha</th><th style="padding:10px;text-align:left">Horario</th><th style="padding:10px;text-align:left">Materia</th><th style="padding:10px;text-align:left">Curso</th></tr></thead><tbody>${tableRows}</tbody></table></div><p style="color:#475569;font-size:13px;line-height:1.6">${escapeHtml(generated)}</p>${caution ? `<p style="color:${color};font-weight:bold">${escapeHtml(caution)}</p>` : ''}${url ? `<a href="${escapeHtml(url)}" style="display:inline-block;margin-top:14px;padding:12px 18px;background:#173c78;color:white;text-decoration:none;border-radius:7px">Ver aviso en EduQuest</a>` : ''}<p style="color:#64748b;font-size:12px;margin-top:28px">Correo automático de EduQuest.</p></div></div></div>`;
  const subjectName = rows.length === 1 ? rows[0].subject : `${rows.length} clases afectadas`;
  return sendConfiguredMail({ institutionId: notice?.institutionId, to, subject: `[EduQuest] ${status} — ${subjectName}`, text, html });
};


// Correos de eventos y suspensiones. El tipo EVENT_CANCELLED se usa también
// para informar a quienes fueron retirados de una audiencia durante una edición.
export const sendInstitutionCommunicationEmail = ({ to, title, message, notificationType, event, revision }) => {
  const isSuspension = event.kind === 'SUSPENSION';
  const isRemoved = String(title || '').startsWith('Ya no estás incluido:');
  const action = isRemoved ? 'CAMBIO DE DESTINATARIOS'
    : notificationType === 'EVENT_CANCELLED' ? 'CANCELACIÓN'
    : notificationType === 'EVENT_UPDATED' ? 'ACTUALIZACIÓN' : 'NUEVA COMUNICACIÓN';
  const kind = isSuspension ? 'Suspensión de actividades' : 'Evento institucional';
  const reasons = { HOLIDAY: 'Feriado', MOURNING: 'Duelo', WEATHER: 'Condiciones climáticas', FACILITIES: 'Problemas edilicios', STRIKE: 'Medida de fuerza', OTHER: 'Otro' };
  const activities = { PRESENTIAL_CLASSES: 'Clases presenciales', VIRTUAL_CLASSES: 'Clases virtuales', EXAMS: 'Evaluaciones', ADMINISTRATIVE: 'Actividades administrativas', EXTRACURRICULAR: 'Actividades extracurriculares' };
  const shifts = { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche' };
  const institutionName = event.institution?.nombre || 'Institución';
  const periodStart = formatDate(event.startsAt, { dateStyle: 'full', timeStyle: 'short' });
  const periodEnd = formatDate(event.endsAt, { dateStyle: 'full', timeStyle: 'short' });
  const venue = isSuspension ? '' : event.locationType === 'OTHER'
    ? [event.venueName, event.venueAddress].filter(Boolean).join(' — ')
    : [institutionName, event.institution?.direccion].filter(Boolean).join(' — ');
  const scope = event.scope === 'INSTITUTION' ? 'Toda la institución'
    : event.scope === 'CAREERS' ? (event.careers || []).map(c => c.career?.nombre).filter(Boolean).join(', ')
    : (event.courses || []).map(c => c.course?.nombre).filter(Boolean).join(', ');
  // Usar el texto específico de la notificación para distinguir cancelación de baja de destinatarios.
  const cancellationExplanation = notificationType === 'EVENT_CANCELLED' && !isRemoved
    ? (isSuspension
      ? 'IMPORTANTE: Se canceló la suspensión de clases. Las clases se desarrollarán normalmente según el horario habitual, salvo que la institución comunique otra disposición.'
      : 'IMPORTANTE: El evento fue cancelado y no se realizará según lo anunciado.')
    : '';
  const lines = [
    action, kind, `Institución: ${institutionName}`,
    ...(cancellationExplanation ? [cancellationExplanation] : []),
    `Asunto: ${event.title}`, `Descripción: ${event.details || '—'}`,
    `Desde: ${periodStart}`, `Hasta: ${periodEnd}`,
    `Alcance: ${scope || 'Consultar EduQuest'}`,
    ...(!isSuspension ? [`Lugar: ${venue || 'A confirmar'}`] : [
      `Motivo: ${reasons[event.suspensionReason] || event.suspensionReason || 'No informado'}`,
      `Actividades afectadas: ${(event.affectedActivities || []).map(a => activities[a] || a).join(', ') || 'No especificadas'}`,
      `Turnos afectados: ${(event.affectedShifts || []).map(a => shifts[a] || a).join(', ') || 'Todos'}`,
    ]),
    `Versión: ${revision || 1}`,
    ...(notificationType === 'EVENT_CANCELLED' ? [`Aviso: ${message || ''}`] : []),
  ];
  const url = frontendLink('/dashboard/institution-communications');
  if (url) lines.push(`Consultá EduQuest: ${url}`);
  const text = lines.join('\n\n');
  const html = `<div style="background:#eef2f7;padding:24px;font-family:Arial,sans-serif;color:#17253b"><div style="max-width:720px;margin:auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #dbe3ef"><div style="background:#173c78;color:white;padding:22px"><b>EduQuest · ${escapeHtml(institutionName)}</b><h2 style="color:white;margin:12px 0 0">${escapeHtml(action)} · ${escapeHtml(kind)}</h2></div><div style="padding:24px"><h2>${escapeHtml(event.title)}</h2>${lines.slice(3, url ? -1 : undefined).map(line => `<p style="white-space:pre-wrap;line-height:1.5">${escapeHtml(line)}</p>`).join('')}${url ? `<p style="margin-top:24px"><a style="display:inline-block;padding:12px 18px;background:#173c78;color:white;border-radius:7px;text-decoration:none" href="${escapeHtml(url)}">Ver en EduQuest</a></p>` : ''}<p style="font-size:12px;color:#64748b">Correo automático institucional.</p></div></div></div>`;
  return sendConfiguredMail({ institutionId: event?.institutionId, to,
    subject: `[EduQuest] ${action} — ${kind}: ${event.title}`, text, html });
};

// Nunca se envía la contraseña por correo: sólo un enlace de un uso, de 15 minutos.
export const sendPasswordResetEmail = async ({ institutionId, to, token, expiresAt }) => {
  const url = new URL(frontendLink('/restablecer-contrasena', { required: true }));
  url.searchParams.set('token', token);
  const link = url.toString();
  return sendConfiguredMail({
    institutionId,
    to,
    subject: 'EduQuest: restablecer contraseña',
    text: `Recibimos una solicitud para restablecer tu contraseña.\n\nAbrí este enlace: ${link}\n\nVence en 15 minutos (${expiresAt.toLocaleString('es-AR')}). Si no lo solicitaste, ignorá este correo.`,
    html: `<div style="font:16px Arial,sans-serif;color:#1e293b;max-width:500px"><h2>EduQuest · Recuperar acceso</h2><p>Recibimos una solicitud para cambiar tu contraseña.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;background:#e89c17;color:#171717;text-decoration:none;font-weight:bold;padding:14px 20px;border-radius:10px">Crear nueva contraseña</a></p><p>El enlace vence en 15 minutos y puede usarse una sola vez.</p><p>Si no lo pediste, ignorá este mensaje.</p></div>`,
  });
};


// La aprobación/rechazo de una cuenta nueva es un correo informativo; no utiliza
// plantillas WhatsApp ni incluye contraseñas, tokens o datos académicos sensibles.
export const sendStudentSignupDecisionEmail = ({ institutionId, to, name, status, reason }) => {
  const approved = status === 'APPROVED';
  const title = approved ? 'Tu inscripción fue aprobada' : 'Novedades sobre tu inscripción';
  const url = frontendLink('/login');
  const message = approved
    ? 'Tu institución aprobó tu solicitud. Ya podés iniciar sesión en EduQuest.'
    : `Tu institución no aprobó tu solicitud. Motivo: ${reason || 'Consultá con la institución'}`;
  return sendConfiguredMail({
    institutionId,
    to,
    subject: `[EduQuest] ${title}`,
    text: `Hola, ${name}.\n\n${message}\n\n${approved ? (url ? `Ingresá desde: ${url}` : 'Ingresá a EduQuest desde el sitio de tu institución.') : 'Podés contactar a la institución para consultar.'}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#172554"><h2>${escapeHtml(title)}</h2><p>Hola, ${escapeHtml(name)}.</p><p>${escapeHtml(message)}</p>${approved ? (url ? `<p><a href="${escapeHtml(url)}">Ingresar a EduQuest</a></p>` : '<p>Ingresá desde el sitio de tu institución.</p>') : '<p>Consultá con tu institución.</p>'}</div>`,
  });
};


// Verificación por correo para alumnos y personal. El token crudo nunca se guarda
// ni aparece en logs; solo existe en el enlace que se envía al interesado.
export const sendEmailVerificationEmail = ({ institutionId, to, name, token }) => {
  const baseUrl = getFrontendBaseUrl();
  if (!baseUrl) throw Object.assign(new Error('No hay una dirección pública válida de React para el enlace de verificación.'), { status: 503 });
  const url = new URL('/verificar-correo', baseUrl);
  url.searchParams.set('token', token);
  const link = url.toString();
  return sendConfiguredMail({
    institutionId,
    to,
    subject: '[EduQuest] Confirmá tu correo electrónico',
    text: `Hola ${name}. Para confirmar tu correo de EduQuest abrí este enlace (válido por 24 horas): ${link}\n\nSi no solicitaste el registro, ignorá este correo.`,
    html: `<div style="font:16px Arial,sans-serif;color:#0f172a;max-width:600px;margin:auto;padding:26px"><h2>EduQuest · Verificación de correo</h2><p>Hola ${escapeHtml(name)}:</p><p>Confirmá tu dirección de correo para continuar con tu inscripción.</p><p><a href="${escapeHtml(link)}" style="background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;padding:14px 20px;display:inline-block">Confirmar mi correo</a></p><p>El enlace caduca en 24 horas y puede utilizarse una sola vez.</p><p>Si no solicitaste esta inscripción, ignorá este mensaje.</p></div>`,
  });
};

export const sendStaffSignupDecisionEmail = ({ institutionId, to, name, role, status, reason }) => {
  const approved = status === 'APPROVED';
  const url = frontendLink('/login');
  const content = approved ? `La institución autorizó tu alta como ${ROLE_LABELS[role] || role}. Ya podés ingresar.`
    : `Tu solicitud no fue aprobada. Motivo: ${reason || 'Consultá con la institución.'}`;
  return sendConfiguredMail({ institutionId, to,
    subject: approved ? '[EduQuest] Tu solicitud de personal fue aprobada' : '[EduQuest] Estado de tu solicitud de personal',
    text: `Hola ${name}.\n\n${content}\n\n${approved && url ? url : ''}`,
    html: `<div style="font:16px Arial,sans-serif;padding:24px;max-width:600px;color:#0f172a"><h2>EduQuest · Solicitud de personal</h2><p>Hola ${escapeHtml(name)}.</p><p>${escapeHtml(content)}</p>${approved && url ? `<a href="${escapeHtml(url)}">Ingresar a EduQuest</a>` : ''}</div>` });
};
