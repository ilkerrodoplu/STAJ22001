import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MenuIcon,
    BellRing,
    ChevronDown,
    User,
    Settings,
    LogOut,
    MessageSquare
} from 'lucide-react';
import { roleLabel } from '../../utils/roles';
import { fullName } from '../../utils/userName';

const AdminHeader = ({
                         isSidebarOpen,
                         setIsSidebarOpen,
                         isNotificationsOpen,
                         toggleNotifications,
                         isUserMenuOpen,
                         toggleUserMenu,
                         userProfile,
                         notifications,
                         unreadCount,
                         notificationLoading,
                         markAllAsRead,
                         handleNotificationClick,
                         formatTimeAgo,
                         getSentimentIcon,
                         handleLogout,
                         paths
                     }) => {
    const navigate = useNavigate();

    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="top-header">
            <div className="header-left">
                <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    <MenuIcon size={24} />
                </button>
            </div>

            <div className="header-right">
                {/* Notification Dropdown */}
                <div className="notification-dropdown">
                    <button
                        className={`notification-btn ${isNotificationsOpen ? 'active' : ''}`}
                        onClick={toggleNotifications}
                    >
                        <BellRing size={20} />
                        {unreadCount > 0 && (
                            <div className="notification-badge">{unreadCount}</div>
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="dropdown-menu notification-menu">
                            <div className="dropdown-header">
                                <h3>Bildirimler</h3>
                                {unreadCount > 0 && (
                                    <button className="mark-all-read" onClick={markAllAsRead}>
                                        Tümünü okundu işaretle
                                    </button>
                                )}
                            </div>

                            <div className="notifications-list">
                                {notificationLoading ? (
                                    <div className="notification-loading">
                                        <div className="spinner"></div>
                                        <span>Yükleniyor...</span>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="empty-notifications">
                                        <div className="empty-icon">🔔</div>
                                        <p>Şu anda bildirim bulunmuyor.</p>
                                    </div>
                                ) : (
                                    notifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            className={`notification-item ${!notification.read ? 'unread' : ''}`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <div className="notification-icon">
                                                <span style={{ fontSize: '16px' }}>
                                                    {getSentimentIcon(notification.sentiment)}
                                                </span>
                                            </div>
                                            <div className="notification-content">
                                                <p className="notification-text">
                                                    {notification.message}
                                                </p>
                                                {notification.comment && (
                                                    <p className="notification-comment">
                                                        "{notification.comment.length > 50
                                                        ? notification.comment.substring(0, 50) + '...'
                                                        : notification.comment}"
                                                    </p>
                                                )}
                                                <div className="notification-time">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </div>
                                            </div>
                                            {!notification.read && (
                                                <div className="unread-dot"></div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {notifications.length > 0 && (
                                <div className="dropdown-footer">
                                    <a
                                        href={paths.notifications}
                                        className="view-all-link"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate(paths.notifications);
                                            toggleNotifications();
                                        }}
                                    >
                                        Tüm Bildirimleri Görüntüle
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* User Dropdown */}
                <div className="user-dropdown">
                    <button
                        className={`user-menu-btn ${isUserMenuOpen ? 'active' : ''}`}
                        onClick={toggleUserMenu}
                    >
                        <div className="user-avatar">
                            {userProfile.avatar ? (
                                <img src={userProfile.avatar} alt="User" />
                            ) : (
                                <div className="avatar-placeholder">
                                    {getInitials(fullName(userProfile))}
                                </div>
                            )}
                        </div>
                        <div className="user-info">
                            <span>{fullName(userProfile)}</span>
                            <ChevronDown size={16} />
                        </div>
                    </button>

                    {isUserMenuOpen && (
                        <div className="dropdown-menu user-menu">
                            <div className="dropdown-header">
                                <div className="user-details">
                                    <div className="user-name">{fullName(userProfile)}</div>
                                    <div className="user-email">{userProfile.email || ''}</div>
                                    <div className="user-role">{roleLabel(userProfile.roles)}</div>
                                </div>
                            </div>

                            <div className="dropdown-items">
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        navigate(paths.profile);
                                        toggleUserMenu();
                                    }}
                                >
                                    <User size={16} />
                                    <span>Profilim</span>
                                </button>

                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        navigate(paths.settings);
                                        toggleUserMenu();
                                    }}
                                >
                                    <Settings size={16} />
                                    <span>Ayarlar</span>
                                </button>

                                <button className="dropdown-item" onClick={handleLogout}>
                                    <LogOut size={16} />
                                    <span>Çıkış Yap</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminHeader;
