import nodemailer from 'nodemailer';

const ROLE_LABELS = {
  DIRECTOR: 'Directivo',
  PRECEPTOR: 'Preceptor',
  TEACHER: 'Docente',
  STUDENT: 'Alumno',
};

let transporter;

// Se crea recién al primer envío, para que las variables de entorno ya estén cargadas
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

export const sendInvitationEmail = async ({ to, token, role, expiresAt }) => {
  const link = `${process.env.FRONTEND_URL}/aceptar-invitacion/${token}`;
  const roleLabel = ROLE_LABELS[role] ?? role;
  const expires = expiresAt.toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });

  return getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Te invitaron a unirte a la plataforma',
    text: `Fuiste invitado como ${roleLabel}.\n\nAceptá la invitación en: ${link}\n\nVence el ${expires}.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px;">
        <h2>Te invitaron a unirte</h2>
        <p>Fuiste invitado como <strong>${roleLabel}</strong>.</p>
        <p>
          <a href="${link}"
             style="display:inline-block;padding:10px 20px;background:#9333ea;color:#fff;border-radius:6px;text-decoration:none;">
            Aceptar invitación
          </a>
        </p>
        <p style="color:#666;font-size:13px;">Esta invitación vence el ${expires}.</p>
        <p style="color:#666;font-size:13px;">Si no esperabas este correo, podés ignorarlo.</p>
      </div>
    `,
  });
};