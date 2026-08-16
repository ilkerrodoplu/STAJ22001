
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { isSiteAdmin, canViewResults, isPendingMember } from '../utils/roles';

const API_BASE_URL = process.env.REACT_APP_API_URL;

/** Yetkisiz erişimde kişi kayıtlıysa e-postası, değilse IP'si gösterilir. */
const actorLabel = (event) =>
    event.userEmail ? (event.userName ? `${event.userName} (${event.userEmail})` : event.userEmail)
        : `Anonim ziyaretçi - IP ${event.ip || 'bilinmiyor'}`;

/** Süper adminin zilinde görünen kayıtlar tek bir biçime indirgenir. */
const toBellItem = {
    message: (message) => ({
        id: `msg-${message.id}`,
        message: `Yeni mesaj: ${message.companyName || 'Şirket'}`,
        comment: message.body,
        createdAt: message.createdAt,
        read: false,
        sentiment: 'info',
        actionUrl: '/admin/super/messages'
    }),
    securityEvent: (event) => ({
        id: `sec-${event.id}`,
        message: event.type === 'FORBIDDEN'
            ? `Yetkisiz erişim denemesi: ${actorLabel(event)}`
            : `Oturumsuz erişim denemesi: ${actorLabel(event)}`,
        comment: `${event.method} ${event.path}${event.page ? ` · sayfa: ${event.page}` : ''}`,
        createdAt: event.createdAt,
        read: event.read,
        sentiment: 'negative',
        actionUrl: '/admin/super/notifications'
    })
};

// Context oluştur
export const NotificationContext = createContext(null);

// NotificationProvider component
export const NotificationProvider = ({ children }) => {
    const { userProfile, isAuthenticated } = useAuth();

    // State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // API Token'ı al
    const getAuthToken = useCallback(() => {
        return localStorage.getItem('authToken') ||
            localStorage.getItem('token') ||
            sessionStorage.getItem('authToken') ||
            sessionStorage.getItem('token');
    }, []);

    // Süper adminin şirketi yoktur; zili şirket bildirimleriyle değil, site
    // yönetimi bildirimleriyle (şirket mesajları + yetkisiz erişim) beslenir.
    const superAdmin = isSiteAdmin(userProfile?.roles);

    // Şirket bildirimleri müşteri verisidir; anket hazırlayan/paylaşan bunu
    // görmez. Yetkisi olmayan için zil hiç sorgulanmaz, yoksa 30 saniyede bir
    // 403 alınır ve her biri süper adminin denetim listesine düşerdi.
    // Katılımı onay bekleyen çalışanın rolü henüz işlemez; zil sorgulanırsa aynı
    // şekilde 30 saniyede bir 403 üretirdi.
    const seesCompanyNotifications = canViewResults(userProfile?.roles) && !isPendingMember(userProfile);

    const loadAdminNotifications = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const token = getAuthToken();
            if (!token) return;

            const { data } = await axios.get(`${API_BASE_URL}/api/v1/admin/notifications/feed`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const items = [
                ...(data.messages || []).map(toBellItem.message),
                ...(data.securityEvents || []).map(toBellItem.securityEvent)
            ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setNotifications(items);
            setUnreadCount(items.filter(item => !item.read).length);
            setError(null);
        } catch (err) {
            console.error('Süper admin bildirimleri yüklenemedi:', err);
            setNotifications([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, getAuthToken]);

    const fetchAdminUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const token = getAuthToken();
            if (!token) return;

            const { data } = await axios.get(`${API_BASE_URL}/api/v1/admin/notifications/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(data.unreadCount || 0);
        } catch (err) {
            console.error('Bildirim sayısı alınamadı:', err);
        }
    }, [isAuthenticated, getAuthToken]);

    const markAllAdminRead = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) return false;

            await axios.post(`${API_BASE_URL}/api/v1/admin/notifications/mark-all-read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNotifications(prev => prev.map(item => ({ ...item, read: true })));
            setUnreadCount(0);
            return true;
        } catch (err) {
            console.error('Bildirimler okundu işaretlenemedi:', err);
            return false;
        }
    }, [getAuthToken]);

    // Bildirimleri yükle
    const loadNotifications = useCallback(async (limit = 10) => {
        if (!userProfile?.companyId || !isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await axios.get(
                `${API_BASE_URL}/api/v1/notifications/company/${userProfile.companyId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    params: { limit }
                }
            );

            const notificationData = response.data || [];
            setNotifications(notificationData);

            // Okunmamış bildirim sayısını hesapla
            const unread = notificationData.filter(n => !n.read).length;
            setUnreadCount(unread);

        } catch (error) {
            console.error('Failed to load notifications:', error);
            setError(error.message || 'Bildirimler yüklenirken hata oluştu');
            setNotifications([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    }, [userProfile?.companyId, isAuthenticated, getAuthToken]);

    // Okunmamış bildirimleri yükle
    const loadUnreadNotifications = useCallback(async () => {
        if (!userProfile?.companyId || !isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await axios.get(
                `${API_BASE_URL}/api/v1/notifications/company/${userProfile.companyId}/unread`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const notificationData = response.data || [];
            setNotifications(notificationData.slice(0, 5)); // Son 5 okunmamış
            setUnreadCount(notificationData.length);

        } catch (error) {
            console.error('Failed to load unread notifications:', error);
            setError(error.message || 'Okunmamış bildirimler yüklenirken hata oluştu');
            setNotifications([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    }, [userProfile?.companyId, isAuthenticated, getAuthToken]);

    // Okunmamış sayısını al
    const fetchUnreadCount = useCallback(async () => {
        if (!userProfile?.companyId || !isAuthenticated) {
            setUnreadCount(0);
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await axios.get(
                `${API_BASE_URL}/api/v1/notifications/company/${userProfile.companyId}/unread-count`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setUnreadCount(response.data.unreadCount || 0);

        } catch (error) {
            console.error('Failed to fetch unread count:', error);
            setUnreadCount(0);
        }
    }, [userProfile?.companyId, isAuthenticated, getAuthToken]);

    // Bildirimi okundu olarak işaretle
    const markAsRead = useCallback(async (notificationId) => {
        try {
            const token = getAuthToken();
            if (!token) return false;

            await axios.put(
                `${API_BASE_URL}/api/v1/notifications/${notificationId}/read`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Local state'i güncelle
            setNotifications(prev =>
                prev.map(notif =>
                    notif.id === notificationId
                        ? { ...notif, read: true }
                        : notif
                )
            );

            // Unread count'u azalt
            setUnreadCount(prev => Math.max(0, prev - 1));

            return true;

        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            return false;
        }
    }, [getAuthToken]);

    // Tüm bildirimleri okundu olarak işaretle
    const markAllAsRead = useCallback(async () => {
        if (!userProfile?.companyId) return false;

        try {
            const token = getAuthToken();
            if (!token) return false;

            await axios.put(
                `${API_BASE_URL}/api/v1/notifications/company/${userProfile.companyId}/read-all`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Local state'i güncelle
            setNotifications(prev =>
                prev.map(notif => ({ ...notif, read: true }))
            );
            setUnreadCount(0);

            return true;

        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            return false;
        }
    }, [userProfile?.companyId, getAuthToken]);

    // Bildirimi sil
    const deleteNotification = useCallback(async (notificationId) => {
        try {
            const token = getAuthToken();
            if (!token) return false;

            await axios.delete(
                `${API_BASE_URL}/api/v1/notifications/${notificationId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Local state'den kaldır
            setNotifications(prev => {
                const updated = prev.filter(notif => notif.id !== notificationId);
                return updated;
            });

            // Eğer silinecek bildirim okunmamışsa unread count'u azalt
            const deletedNotification = notifications.find(n => n.id === notificationId);
            if (deletedNotification && !deletedNotification.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

            return true;

        } catch (error) {
            console.error('Failed to delete notification:', error);
            return false;
        }
    }, [getAuthToken, notifications]);

    // Bildirimleri yenile
    const refreshNotifications = useCallback(() => {
        loadNotifications();
    }, [loadNotifications]);

    // Component mount olduğunda ve user profile değiştiğinde bildirimleri yükle
    useEffect(() => {
        if (!isAuthenticated) return;

        if (superAdmin) {
            loadAdminNotifications();
            const interval = setInterval(fetchAdminUnreadCount, 30000);
            return () => clearInterval(interval);
        }

        if (userProfile?.companyId && seesCompanyNotifications) {
            loadUnreadNotifications();

            // Periyodik güncelleme (30 saniye)
            const interval = setInterval(() => {
                fetchUnreadCount();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [superAdmin, seesCompanyNotifications, userProfile?.companyId, isAuthenticated,
        loadAdminNotifications, fetchAdminUnreadCount, loadUnreadNotifications, fetchUnreadCount]);

    // Context value
    const contextValue = {
        // State
        notifications,
        unreadCount,
        loading,
        error,

        // Actions - süper adminde site yönetimi bildirimleri kullanılır
        loadNotifications: superAdmin ? loadAdminNotifications : loadNotifications,
        loadUnreadNotifications: superAdmin ? loadAdminNotifications : loadUnreadNotifications,
        fetchUnreadCount: superAdmin ? fetchAdminUnreadCount : fetchUnreadCount,
        markAsRead,
        markAllAsRead: superAdmin ? markAllAdminRead : markAllAsRead,
        deleteNotification,
        refreshNotifications,

        // Utils
        clearError: () => setError(null)
    };

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
};

// Custom hook to use notification context
export const useNotification = () => {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }

    return context;
};

// Optional: Safe hook that doesn't throw error
export const useNotificationSafe = () => {
    const context = useContext(NotificationContext);

    // Context mevcut değilse default değerler döndür
    if (!context) {
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

export default NotificationContext;
