import React, { useState, useRef, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const { unreadCount, notifications, markAsRead, markAllAsRead, deleteNotification } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }

        // Survey response detayına git
        navigate(`/admin/surveys/${notification.surveyTemplateId}/responses`, {
            state: { highlightResponse: notification.surveyResponseId }
        });
        setIsOpen(false);
    };

    const formatTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Az önce';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} sa önce`;
        return `${Math.floor(diffInSeconds / 86400)} gün önce`;
    };

    const getSentimentIcon = (sentiment) => {
        return sentiment === 'positive' ? '😊' : '😔';
    };

    const getSentimentColor = (sentiment) => {
        return sentiment === 'positive'
            ? 'border-l-green-400 bg-green-50'
            : 'border-l-red-400 bg-red-50';
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full transition-colors"
                aria-label="Bildirimler"
            >
                🔔

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Bildirimler</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Tümünü okundu işaretle
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <div className="text-4xl mb-2">🔔</div>
                                <p>Şu anda bildirim bulunmuyor.</p>
                            </div>
                        ) : (
                            notifications.slice(0, 10).map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                                        !notification.read ? 'bg-blue-50' : 'bg-white'
                                    } ${getSentimentColor(notification.sentiment)}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-3 flex-1">
                                            <div className="text-2xl">
                                                {getSentimentIcon(notification.sentiment)}
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                    {notification.message}
                                                </p>
                                                {notification.comment && (
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                        "{notification.comment.length > 80
                                                        ? notification.comment.substring(0, 80) + '...'
                                                        : notification.comment}"
                                                    </p>
                                                )}
                                                <div className="flex items-center mt-2 text-xs text-gray-400">
                                                    <span>{formatTimeAgo(notification.createdAt)}</span>
                                                    {notification.sentimentScore && (
                                                        <span className="ml-2">
                              • Skor: {(notification.sentimentScore * 100).toFixed(0)}%
                            </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center space-x-1 ml-2">
                                            {!notification.read && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                                title="Sil"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 10 && (
                        <div className="px-4 py-3 border-t border-gray-200 text-center">
                            <button
                                onClick={() => {
                                    navigate('/admin/notifications');
                                    setIsOpen(false);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Tüm bildirimleri görüntüle
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;