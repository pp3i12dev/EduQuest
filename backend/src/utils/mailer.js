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

const noticeDate = (value) => value
  ? new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
  : '—';

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
  const typeNames = { ABSENCE: 'Ausencia', LATE_ARRIVAL: 'Llegada tarde', ATTENDANCE_CONFIRMED: 'Asistencia confirmada', VIRTUAL_SYNCHRONOUS: 'Clase virtual sincrónica', VIRTUAL_ASYNCHRONOUS: 'Clase virtual asincrónica' };
  const kind = typeNames[notice?.type] || 'Aviso temprano';
  const classes = notice?.classes?.length ? notice.classes : notice ? [{
    classDate: notice.classDate, startTime: notice.startTime, endTime: notice.endTime,
    teacherSubject: { subject: notice.subject, course: notice.course },
  }] : [];
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
  const caution = status === 'ESPERANDO CONFIRMACIÓN DEL DOCENTE'
    ? 'INFORMACIÓN PROVISORIA: el docente todavía no confirmó el aviso. Las clases continúan oficialmente programadas hasta su confirmación.'
    : status === 'RECHAZADO' ? 'El docente rechazó el aviso. Las clases continúan según el horario oficial.' : '';
  // El motivo puede contener datos médicos o personales. No se incluye en correos a estudiantes.
  const generated = notice ? `Generado por ${creatorRole} ${creator} el ${formatDate(notice.createdAt, { dateStyle: 'long', timeStyle: 'short' })}.` : '';
  const lines = rows.map((r) => `${r.date} | ${r.time} | ${r.subject} | ${r.course}`);
  const text = `${status}\n\n${summary}\n\nClases afectadas:\n${lines.join('\n') || 'Consultar EduQuest'}\n\n${generated}\n${caution}\n\nConsultá EduQuest: ${url}`;
  const tableRows = rows.map((r) => `<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.date)}</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.time)}</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.subject)}</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(r.course)}</td></tr>`).join('');
  const html = `<div style="background:#f1f5f9;padding:24px 12px;font-family:Arial,sans-serif;color:#0f172a"><div style="max-width:760px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"><div style="background:#173c78;padding:22px;color:#fff"><b>EduQuest · Avisos Tempranos</b><h2 style="color:#fff;margin:10px 0 0">${escapeHtml(title)}</h2></div><div style="padding:24px"><div style="background:${background};color:${color};font-weight:bold;font-size:18px;padding:16px;border-radius:8px;text-align:center">${escapeHtml(status)}</div><p style="font-size:16px;line-height:1.7">${escapeHtml(summary)}</p><h3 style="font-size:16px">Clases afectadas (${rows.length})</h3><div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:13px"><thead><tr style="background:#e2e8f0"><th style="padding:10px;text-align:left">Fecha</th><th style="padding:10px;text-align:left">Horario</th><th style="padding:10px;text-align:left">Materia</th><th style="padding:10px;text-align:left">Curso</th></tr></thead><tbody>${tableRows}</tbody></table></div><p style="color:#475569;font-size:13px;line-height:1.6">${escapeHtml(generated)}</p>${caution ? `<p style="color:${color};font-weight:bold">${escapeHtml(caution)}</p>` : ''}<a href="${escapeHtml(url)}" style="display:inline-block;margin-top:14px;padding:12px 18px;background:#173c78;color:white;text-decoration:none;border-radius:7px">Ver aviso en EduQuest</a><p style="color:#64748b;font-size:12px;margin-top:28px">Correo automático de EduQuest.</p></div></div></div>`;
  const subjectName = rows.length === 1 ? rows[0].subject : `${rows.length} clases afectadas`;
  return getTransporter().sendMail({ from: process.env.MAIL_FROM, to, subject: `[EduQuest] ${status} — ${subjectName}`, text, html });
};
