import { notificationEmailRepository as repo } from '../repositories/notificationEmail.repository.js';
import { sendEarlyNoticeEmail, sendInstitutionCommunicationEmail } from '../utils/mailer.js';

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
        const notification = delivery.notification;
        if (!notification) {
          await repo.cancel(id, 'Notificación inexistente');
          continue;
        }
        let info;
        if (notification.institutionEventId != null) {
          const event = notification.institutionEvent;
          if (!event || event.deletedAt) {
            await repo.cancel(id, 'Comunicación institucional inexistente o eliminada');
            continue;
          }
          // Las cancelaciones deben enviarse aunque isActive sea false.
          if (notification.type !== 'EVENT_CANCELLED' && !event.isActive) {
            await repo.cancel(id, 'Comunicación cancelada antes del envío');
            continue;
          }
          info = await sendInstitutionCommunicationEmail({
            to: delivery.recipient,
            title: notification.title,
            message: notification.message,
            notificationType: notification.type,
            event,
            revision: notification.revision,
          });
        } else if (notification.earlyNoticeId != null) {
          if (!notification.earlyNotice?.isActive) {
            await repo.cancel(id, 'Aviso temprano desactivado o inexistente');
            continue;
          }
          info = await sendEarlyNoticeEmail({
            to: delivery.recipient,
            title: notification.title,
            message: notification.message,
            notificationType: notification.type,
            notice: notification.earlyNotice,
          });
        } else {
          await repo.cancel(id, 'Notificación sin origen');
          continue;
        }
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
