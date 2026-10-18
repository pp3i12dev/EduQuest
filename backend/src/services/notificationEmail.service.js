import { notificationEmailRepository as repo } from '../repositories/notificationEmail.repository.js';
import { sendEarlyNoticeEmail } from '../utils/mailer.js';

const INTERVAL_MS = 30_000;
let timer = null;
let processing = false;

export const processPendingNotificationEmails = async () => {
  if (processing) return;
  processing = true;
  try {
    const pending = await repo.listPending(20);
    for (const { id } of pending) {
      let delivery;
      try {
        delivery = await repo.claim(id);
        if (!delivery) continue;
        // Evitar enviar correos de avisos desactivados antes de la entrega.
        if (!delivery.notification?.earlyNotice?.isActive) {
          await repo.cancel(id, 'Aviso temprano desactivado o inexistente');
          continue;
        }
        const info = await sendEarlyNoticeEmail({
          to: delivery.recipient,
          title: delivery.notification.title,
          message: delivery.notification.message,
          notificationType: delivery.notification.type,
          notice: delivery.notification.earlyNotice,
        });
        // SMTP aceptado no significa necesariamente entregado al buzón.
        await repo.markSent(id, info.messageId);
        console.info(`[EduQuest][EMAIL] Envío aceptado: entrega ${id}`);
      } catch (error) {
        console.error(`[EduQuest][EMAIL] Error en entrega ${id}:`, error);
        if (delivery) {
          try {
            await repo.markFailure(id, error.message || String(error), delivery.attempts);
          } catch (dbError) {
            console.error(`[EduQuest][EMAIL] No se pudo registrar fallo ${id}:`, dbError);
          }
        }
      }
    }
  } catch (error) {
    console.error('[EduQuest][EMAIL] Error consultando entregas:', error);
  } finally {
    processing = false;
  }
};

export const startNotificationEmailProcessor = () => {
  if (process.env.NOTIFICATION_EMAIL_ENABLED !== 'true') {
    console.info('[EduQuest][EMAIL] Procesador desactivado');
    return;
  }
  if (timer) return;
  console.info('[EduQuest][EMAIL] Procesador iniciado (cada 30 segundos)');
  void processPendingNotificationEmails();
  timer = setInterval(() => void processPendingNotificationEmails(), INTERVAL_MS);
  timer.unref?.();
};

export const stopNotificationEmailProcessor = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
