
// src/components/dashboard/NotificationsTable.jsx
import React, { useState, useEffect } from 'react';
import NotificationsDisplay from './NotificationsDisplay';
import { formatFullDate } from '../../utils/dashboardUtils';

const NotificationsTable = ({ companyId, title = "Son Bildirimler", initialLimit = 10 }) => {
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // API state'leri
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Filter states
    const [selectedType, setSelectedType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalNotifications, setTotalNotifications] = useState(0);

    // Component mount olduğunda notifications'ları yükle
    useEffect(() => {
        if (companyId) {
            fetchNotifications();
        }
    }, [companyId]);

    // Filter veya page değiştiğinde notifications'ları yeniden yükle
    useEffect(() => {
        if (companyId) {
            fetchNotifications();
        }
    }, [selectedType, selectedStatus, currentPage, companyId]);

    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);

        try {
            let apiUrl = `${process.env.REACT_APP_API_URL}/api/v1/notifications?size=${initialLimit}&page=${currentPage - 1}&companyId=${companyId}`;

            if (selectedType && selectedType !== '') {
                apiUrl += `&type=${selectedType}`;
            }

            if (selectedStatus && selectedStatus !== '') {
                apiUrl += `&status=${selectedStatus}`;
            }

            console.log('🔔 Notifications API Call:', apiUrl);

            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const result = await response.json();
                // Backend okundu bilgisini "read" olarak döndürüyor (Jackson isRead() -> read)
                const notificationsData = (result.content || result.data || result || [])
                    .map(n => ({ ...n, isRead: n.isRead ?? n.read ?? false }));

                // Pagination bilgilerini set et
                setTotalPages(result.totalPages || 1);
                setTotalNotifications(result.totalElements || result.total || notificationsData.length);

                setNotifications(notificationsData);
                console.log('✅ Notifications loaded:', notificationsData.length);
            } else {
                const errorText = await response.text();
                console.error('Notifications yüklenemedi:', response.status, errorText);
                setError(`Bildirimler yüklenemedi: ${response.status}`);
                setNotifications([]);
            }
        } catch (error) {
            console.error('Notifications fetch error:', error);
            setError('Bildirimler yüklenirken hata oluştu');
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        setSelectedType(newType);
        setCurrentPage(1);
        setExpandedRows(new Set());
        console.log('🔄 Type filter changed:', newType || 'All types');
    };

    const handleStatusChange = (e) => {
        const newStatus = e.target.value;
        setSelectedStatus(newStatus);
        setCurrentPage(1);
        setExpandedRows(new Set());
        console.log('🔄 Status filter changed:', newStatus || 'All statuses');
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        setExpandedRows(new Set());
    };

    const toggleRow = (index) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedRows(newExpanded);
    };

    const handleDetailClick = (item) => {
        setSelectedNotification(item);
        setIsModalOpen(true);

        // Bildirimi okundu olarak işaretle
        if (!item.isRead) {
            markAsRead(item.id);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedNotification(null);
    };

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                // Local state'i güncelle
                setNotifications(prev =>
                    prev.map(notif =>
                        notif.id === notificationId
                            ? { ...notif, isRead: true, readAt: new Date().toISOString() }
                            : notif
                    )
                );
                console.log('✅ Notification marked as read:', notificationId);
            }
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/notifications/mark-all-read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ companyId })
            });

            if (response.ok) {
                // Tüm bildirimleri okundu olarak işaretle
                setNotifications(prev =>
                    prev.map(notif => ({
                        ...notif,
                        isRead: true,
                        readAt: new Date().toISOString()
                    }))
                );
                console.log('✅ All notifications marked as read');
            }
        } catch (error) {
            console.error('Mark all as read error:', error);
        }
    };

    const deleteById = (notificationId) =>
        fetch(`${process.env.REACT_APP_API_URL}/api/v1/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            },
        });

    const deleteNotification = async (notificationId) => {
        if (!window.confirm('Bu bildirimi silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const response = await deleteById(notificationId);

            if (response.ok) {
                // Local state'den kaldır
                setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
                setTotalNotifications(prev => prev - 1);
                console.log('✅ Notification deleted:', notificationId);
            }
        } catch (error) {
            console.error('Delete notification error:', error);
        }
    };

    // 🧹 Okunmuş bildirimleri temizle
    // ponytail: toplu silme endpoint'i yok, sayfa başına ~10 kayıt tek tek siliniyor
    const deleteReadNotifications = async () => {
        const readOnes = notifications.filter(n => n.isRead);
        if (readOnes.length === 0) {
            window.alert('Silinecek okunmuş bildirim yok.');
            return;
        }
        if (!window.confirm(`${readOnes.length} okunmuş bildirim silinecek. Emin misiniz?`)) {
            return;
        }

        try {
            await Promise.all(readOnes.map(n => deleteById(n.id)));
            fetchNotifications();
        } catch (error) {
            console.error('Bulk delete error:', error);
        }
    };

    // 📤 Görüntülenen bildirimleri CSV olarak indir
    const exportNotifications = () => {
        const rows = [
            ['Tarih', 'Tür', 'Başlık', 'Mesaj', 'Durum'],
            ...notifications.map(n => [
                formatFullDate(n.createdAt),
                getNotificationTypeText(n.type),
                n.title || '',
                n.message || '',
                n.isRead ? 'Okundu' : 'Okunmadı'
            ])
        ];
        const csv = rows
            .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
            .join('\n');

        // BOM + ';' => Excel'de Türkçe karakterler ve sütunlar doğru açılır
        const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `bildirimler-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleRefresh = () => {
        fetchNotifications();
    };

    const getNotificationTypeStyle = (type) => {
        const styles = {
            'survey': 'bg-blue-100 text-blue-800',
            'comment': 'bg-green-100 text-green-800',
            'system': 'bg-gray-100 text-gray-800',
            'alert': 'bg-red-100 text-red-800',
            'info': 'bg-yellow-100 text-yellow-800',
            'success': 'bg-emerald-100 text-emerald-800'
        };
        return styles[type] || 'bg-gray-100 text-gray-800';
    };

    const getNotificationTypeText = (type) => {
        const types = {
            'survey': 'Anket',
            'comment': 'Yorum',
            'system': 'Sistem',
            'alert': 'Uyarı',
            'info': 'Bilgi',
            'success': 'Başarılı'
        };
        return types[type] || 'Diğer';
    };

    const getNotificationIcon = (type) => {
        const icons = {
            'survey': '📋',
            'comment': '💬',
            'system': '⚙️',
            'alert': '⚠️',
            'info': 'ℹ️',
            'success': '✅'
        };
        return icons[type] || '🔔';
    };

    return (
        <>
            <NotificationsDisplay
                // Props
                title={title}
                loading={loading}
                error={error}
                notifications={notifications}

                // States
                selectedType={selectedType}
                selectedStatus={selectedStatus}
                expandedRows={expandedRows}
                currentPage={currentPage}
                totalPages={totalPages}
                totalNotifications={totalNotifications}

                // Handlers
                handleTypeChange={handleTypeChange}
                handleStatusChange={handleStatusChange}
                handlePageChange={handlePageChange}
                handleRefresh={handleRefresh}
                toggleRow={toggleRow}
                handleDetailClick={handleDetailClick}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                deleteNotification={deleteNotification}
                deleteReadNotifications={deleteReadNotifications}
                exportNotifications={exportNotifications}

                // Utils
                getNotificationTypeStyle={getNotificationTypeStyle}
                getNotificationTypeText={getNotificationTypeText}
                getNotificationIcon={getNotificationIcon}
                formatFullDate={formatFullDate}
            />

            {/* Notification Detail Modal */}
            {isModalOpen && selectedNotification && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">
                                        {getNotificationIcon(selectedNotification.type)}
                                    </span>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Bildirim Detayı
                                        </h3>
                                        <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${getNotificationTypeStyle(selectedNotification.type)}`}>
                                            {getNotificationTypeText(selectedNotification.type)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600 text-xl"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">
                                        {selectedNotification.title}
                                    </h4>
                                    <p className="text-gray-700 leading-relaxed">
                                        {selectedNotification.message}
                                    </p>
                                </div>

                                <div className="border-t pt-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium text-gray-500">Tarih:</span>
                                            <p className="text-gray-900">
                                                {formatFullDate(selectedNotification.createdAt)}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-500">Durum:</span>
                                            <p className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                                                selectedNotification.isRead
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {selectedNotification.isRead ? 'Okundu' : 'Okunmadı'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {selectedNotification.actionUrl && (
                                    <div className="border-t pt-4">
                                        <a
                                            href={selectedNotification.actionUrl}
                                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center space-x-2"
                                        >
                                            <span>🔗</span>
                                            <span>İlgili Sayfaya Git</span>
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
                                <button
                                    onClick={() => deleteNotification(selectedNotification.id)}
                                    className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg transition-colors"
                                >
                                    🗑️ Sil
                                </button>
                                <button
                                    onClick={handleCloseModal}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NotificationsTable;
