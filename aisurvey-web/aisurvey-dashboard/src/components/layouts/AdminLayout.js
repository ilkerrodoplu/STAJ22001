
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications'; // Hook'u import et
import useDarkMode from '../../hooks/useDarkMode';
import { formatTimeAgo, getSentimentIcon } from '../../utils/notificationHelpers';
import { isSiteAdmin, isPendingMember } from '../../utils/roles';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AppFooter from './AppFooter';

/** Rolün kendi sayfa adresleri. Süper adminin hiçbir sayfası şirket tarafıyla ortak değildir. */
const COMPANY_PATHS = {
    dashboard: '/admin/dashboard',
    notifications: '/admin/notifications',
    profile: '/admin/profile',
    settings: '/admin/settings'
};

const SUPER_ADMIN_PATHS = {
    dashboard: '/admin/super/dashboard',
    notifications: '/admin/super/notifications',
    profile: '/admin/super/profile',
    settings: '/admin/super/settings'
};

export default function AdminLayout() {
    const { logout, userProfile, fetchUserProfile } = useAuth();
    const navigate = useNavigate();
    const paths = isSiteAdmin(userProfile?.roles) ? SUPER_ADMIN_PATHS : COMPANY_PATHS;

    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    // Tema paneli ve genel sayfaları birlikte yönetir.
    const { isDarkMode, toggleDarkMode } = useDarkMode();

    // Bildirimler hook'undan alınacak - Context yerine hook kullan
    const {
        notifications,
        unreadCount,
        loading: notificationLoading,
        loadNotifications,
        markAllAsRead,
        markAsRead
    } = useNotifications(userProfile);

    // Handlers
    const closeSidebar = () => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    const toggleUserMenu = () => {
        setIsUserMenuOpen(!isUserMenuOpen);
        setIsNotificationsOpen(false);
    };

    const toggleNotifications = () => {
        setIsNotificationsOpen(!isNotificationsOpen);
        setIsUserMenuOpen(false);
        if (!isNotificationsOpen && loadNotifications) {
            loadNotifications();
        }
    };

    const handleLogout = () => {
        const redirectUrl = logout();
        navigate(redirectUrl);
    };

    const handleNotificationClick = async (notification) => {
        // Süper admin bildirimleri (mesaj / yetkisiz erişim) kendi sayfasına gider.
        if (notification.actionUrl) {
            navigate(notification.actionUrl);
            setIsNotificationsOpen(false);
            return;
        }

        if (!notification.read && markAsRead) {
            await markAsRead(notification.id);
        }
        navigate(paths.notifications, {
            state: {
                highlightResponse: notification.surveyResponseId,
                surveyTemplateId: notification.surveyTemplateId
            }
        });
        setIsNotificationsOpen(false);
    };

    // Rol ve katılım onayı sahibin elinde ve panel açıkken değişebiliyor;
    // her panel açılışında profil tazelenir, aksi halde onaylanan çalışan
    // localStorage'daki eski "onay bekliyor" bilgisiyle kilitli kalıyordu.
    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    // Effects
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };

        const handleClickOutside = (event) => {
            if (!event.target.closest('.notification-dropdown')) {
                setIsNotificationsOpen(false);
            }
            if (!event.target.closest('.user-dropdown')) {
                setIsUserMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        document.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);


    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <AdminSidebar
                isSidebarOpen={isSidebarOpen}
                closeSidebar={closeSidebar}
                userProfile={userProfile}
                unreadCount={unreadCount || 0}
                isDarkMode={isDarkMode}
                toggleDarkMode={toggleDarkMode}
                handleLogout={handleLogout}
            />

            {/* Main Content */}
            <div className="main-content">
                {/* Header */}
                <AdminHeader
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    isNotificationsOpen={isNotificationsOpen}
                    toggleNotifications={toggleNotifications}
                    isUserMenuOpen={isUserMenuOpen}
                    toggleUserMenu={toggleUserMenu}
                    userProfile={userProfile}
                    notifications={notifications || []}
                    unreadCount={unreadCount || 0}
                    notificationLoading={notificationLoading || false}
                    markAllAsRead={markAllAsRead}
                    handleNotificationClick={handleNotificationClick}
                    formatTimeAgo={formatTimeAgo}
                    getSentimentIcon={getSentimentIcon}
                    handleLogout={handleLogout}
                    paths={paths}
                />

                {/* Content Area */}
                <div className="content-area">
                    {/* Onay bekleyen çalışan boş bir panele bakıp neden hiçbir
                        sayfaya giremediğini anlamıyordu. */}
                    {isPendingMember(userProfile) && (
                        <div className="mx-auto mb-4 max-w-4xl rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            Şirkete katılma isteğiniz şirket sahibinin onayını bekliyor. Onaylanana kadar
                            yalnızca profil ve ayarlar sayfalarını kullanabilirsiniz.
                        </div>
                    )}
                    <Outlet />
                </div>

                {/* Footer */}
                <AppFooter />
            </div>
        </div>
    );
}
