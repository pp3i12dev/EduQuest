import { useEffect, useState } from 'react';
import { notificationApi } from '../services/notification.service';

export const NOTIFICATIONS_CHANGED = 'eduquest:notifications-changed';
export const notifyNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

export function useUnreadNotifications(enabled = true) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!enabled) return;
        let active = true;
        const refresh = async () => {
            try {
                const response = await notificationApi.unreadCount();
                if (active) setCount(Number(response?.unreadCount) || 0);
            } catch (error) {
                if (active) console.error('No se pudo obtener el contador de notificaciones', error);
            }
        };
        refresh();
        const timer = window.setInterval(refresh, 30000);
        window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
        window.addEventListener('focus', refresh);
        return () => {
            active = false;
            window.clearInterval(timer);
            window.removeEventListener(NOTIFICATIONS_CHANGED, refresh);
            window.removeEventListener('focus', refresh);
        };
    }, [enabled]);
    return enabled ? count : 0;
}
