
import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

export const useNotifications = () => {
    const context = useContext(NotificationContext);

    if (!context) {
        // Context mevcut değilse güvenli default değerler döndür
        return {
            notifications: [],
            unreadCount: 0,
            loading: false,
            error: null,
            loadNotifications: () => Promise.resolve(),
            loadUnreadNotifications: () => Promise.resolve(),
            fetchUnreadCount: () => Promise.resolve(),
            markAsRead: () => Promise.resolve(false),
            markAllAsRead: () => Promise.resolve(false),
            deleteNotification: () => Promise.resolve(false),
            refreshNotifications: () => {},
            clearError: () => {}
        };
    }

    return context;
};

export default useNotifications;
