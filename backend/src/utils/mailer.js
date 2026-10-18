import nodemailer from 'nodemailer';

const ROLE_LABELS = {
  DIRECTOR: 'Directivo', PRECEPTOR: 'Preceptor',
  TEACHER: 'Docente', STUDENT: 'Alumno',
};

let transporter;
export const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

export const sendInvitationEmail = async ({ to, token, role, expiresAt }) => {
  const link = `${process.env.FRONTEND_URL}/aceptar-invitacion/${encodeURIComponent(token)}`;
  const roleLabel = ROLE_LABELS[role] ?? role;
  const expires = expiresAt.toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });
  return getTransporter().sendMail({
    from: process.env.MAIL_FROM,
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

export const sendEarlyNoticeEmail = ({ to, title, message, notificationType, notice }) => {
  const url = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/dashboard/early-notices`;
  const status = notificationType === 'EARLY_NOTICE_PENDING' ? 'ESPERANDO CONFIRMACIÓN DEL DOCENTE'
    : notificationType === 'EARLY_NOTICE_CONFIRMED' ? 'CONFIRMADO'
    : notificationType === 'EARLY_NOTICE_REJECTED' ? 'RECHAZADO' : 'ACTUALIZACIÓN';
  const color = status === 'CONFIRMADO' ? '#166534' : status === 'RECHAZADO' ? '#991b1b' : '#92400e';
  const background = status === 'CONFIRMADO' ? '#dcfce7' : status === 'RECHAZADO' ? '#fee2e2' : '#fef3c7';
  const teacher = fullName(notice?.teacherSubject?.teacher?.user);
  const creator = fullName(notice?.createdBy);
  const creatorRole = notice?.createdBy?.directorProfile ? 'directivo' : notice?.createdBy?.preceptorProfile ? 'preceptor' : notice?.createdBy?.teacherProfile ? 'docente' : 'usuario';
  const subject = notice?.subject?.nombre || 'materia no especificada';
  const course = notice?.course?.nombre || 'curso no especificado';
  // classDate se guarda como fecha UTC sin hora: no convertirla a huso horario local.
  const classDate = notice?.classDate
    ? new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(notice.classDate))
    : 'fecha no especificada';
  const slot = `de ${hour(notice?.startTime)} a ${hour(notice?.endTime)} hs`;
  const action = notice?.type === 'LATE_ARRIVAL'
    ? `llegará tarde a la clase de ${subject} de ${course} del ${classDate}, ${slot}, con llegada estimada a las ${hour(notice?.estimatedArrivalTime)} hs.`
    : `se ausentará de la clase de ${subject} de ${course} del ${classDate}, ${slot}.`;
  const sentence = !notice ? message
    : status === 'RECHAZADO' ? `El docente ${teacher} rechazó el aviso relativo a ${subject} de ${course} del ${classDate}, ${slot}.`
    : status === 'ESPERANDO CONFIRMACIÓN DEL DOCENTE' ? `Se informó que el docente ${teacher} ${action}`
    : `El docente ${teacher} ${action}`;
  const reason = notice?.reason || 'No especificado';
  const generated = notice ? `Este aviso fue generado por el ${creatorRole} ${creator} el ${formatDate(notice.createdAt, { dateStyle: 'long' })} a las ${formatDate(notice.createdAt, { hour: '2-digit', minute: '2-digit', hour12: false })} hs.` : '';
  const caution = status === 'ESPERANDO CONFIRMACIÓN DEL DOCENTE'
    ? 'Información provisoria: el docente todavía puede confirmar o rechazar este aviso.'
    : status === 'RECHAZADO' ? 'El docente rechazó el aviso anterior. No debe considerarse vigente.' : '';
  const text = `${status}\n\n${sentence}\n\nMotivo: ${reason}\n\n${generated}\n${caution}\n\nConsultá EduQuest: ${url}`;
  const html = `<div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"><div style="background:#173c78;padding:22px;color:#fff"><b>EduQuest · Avisos Tempranos</b><h2 style="color:#fff;margin:10px 0 0">${escapeHtml(title)}</h2></div><div style="padding:24px"><div style="background:${background};color:${color};font-weight:bold;font-size:19px;padding:16px;border-radius:8px;text-align:center">${escapeHtml(status)}</div><p style="font-size:16px;line-height:1.7">${escapeHtml(sentence)}</p><div style="background:#f8fafc;padding:16px;border-left:4px solid #173c78"><b>Motivo:</b><p style="margin:8px 0 0;white-space:pre-wrap">${escapeHtml(reason)}</p></div><p style="color:#475569;font-size:13px;line-height:1.6">${escapeHtml(generated)}</p>${caution ? `<p style="color:${color};font-weight:bold">${escapeHtml(caution)}</p>` : ''}<a href="${escapeHtml(url)}" style="display:inline-block;margin-top:14px;padding:12px 18px;background:#173c78;color:white;text-decoration:none;border-radius:7px">Ver aviso en EduQuest</a><p style="color:#64748b;font-size:12px;margin-top:28px">Correo automático de EduQuest.</p></div></div></div>`;
  return getTransporter().sendMail({ from: process.env.MAIL_FROM, to, subject: `[EduQuest] ${status} — ${subject}`, text, html });
};
