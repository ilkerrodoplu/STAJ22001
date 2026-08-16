
// src/components/dashboard/NotificationsDisplay.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotificationsDisplay = ({
                                  title,
                                  loading,
                                  error,
                                  notifications,
                                  selectedType,
                                  selectedStatus,
                                  expandedRows,
                                  currentPage,
                                  totalPages,
                                  totalNotifications,
                                  handleTypeChange,
                                  handleStatusChange,
                                  handlePageChange,
                                  handleRefresh,
                                  toggleRow,
                                  handleDetailClick,
                                  markAsRead,
                                  markAllAsRead,
                                  deleteNotification,
                                  deleteReadNotifications,
                                  exportNotifications,
                                  getNotificationTypeStyle,
                                  getNotificationTypeText,
                                  getNotificationIcon,
                                  formatFullDate
                              }) => {

    const truncateMessage = (message, maxLength = 80) => {
        if (!message) return '';
        return message.length > maxLength
            ? message.substring(0, maxLength) + '...'
            : message;
    };

    // Mobile-friendly Pagination component
    const Pagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisiblePages = window.innerWidth < 640 ? 3 : 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="mt-6 pt-4 border-t border-gray-200">
                {/* Mobile pagination */}
                <div className="flex flex-col space-y-3 sm:hidden">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Sayfa {currentPage} / {totalPages}</span>
                        <span>{totalNotifications} toplam bildirim</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ⬅️
                        </button>

                        {currentPage > 1 && (
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {currentPage - 1}
                            </button>
                        )}

                        <button className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-300 rounded-md">
                            {currentPage}
                        </button>

                        {currentPage < totalPages && (
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {currentPage + 1}
                            </button>
                        )}

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ➡️
                        </button>
                    </div>
                    {totalPages > 5 && (
                        <div className="flex items-center justify-center space-x-2 text-xs">
                            <button
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                                className="px-2 py-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                                İlk
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                                Son
                            </button>
                        </div>
                    )}
                </div>

                {/* Desktop pagination */}
                <div className="hidden sm:flex items-center justify-center space-x-2">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Önceki
                    </button>

                    {startPage > 1 && (
                        <>
                            <button
                                onClick={() => handlePageChange(1)}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                1
                            </button>
                            {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
                        </>
                    )}

                    {pages.map(page => (
                        <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                                page === currentPage
                                    ? 'text-blue-600 bg-blue-50 border border-blue-300'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {page}
                        </button>
                    ))}

                    {endPage < totalPages && (
                        <>
                            {endPage < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
                            <button
                                onClick={() => handlePageChange(totalPages)}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {totalPages}
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sonraki
                    </button>
                </div>
            </div>
        );
    };

    // Loading state
    if (loading && notifications.length === 0) {
        return (
            <div className="rounded-xl bg-white p-4 sm:p-6 shadow-md mx-2 sm:mx-0">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-500">Bildirimler yükleniyor...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="rounded-xl bg-white p-4 sm:p-6 shadow-md mx-2 sm:mx-0">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">❌</div>
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        🔄 Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="rounded-xl bg-white p-4 sm:p-6 shadow-md mx-2 sm:mx-0">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 space-y-4 sm:space-y-0">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold truncate">{title}</h3>
                        {loading && (
                            <div className="animate-spin text-blue-500 flex-shrink-0">
                                ⏳
                            </div>
                        )}
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                {unreadCount} okunmadı
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                        Toplam {totalNotifications} bildirim
                    </p>
                    {totalPages > 1 && (
                        <p className="text-xs text-gray-500 mt-1">
                            Sayfa {currentPage} / {totalPages} - Bu sayfada {notifications.length} bildirim
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        >
                            <span>✅</span>
                            <span className="hidden sm:inline">Tümünü Okundu İşaretle</span>
                            <span className="sm:hidden">Tümü Okundu</span>
                        </button>
                    )}
                    <Link
                        to="/admin/settings"
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        title="Bildirim Ayarları"
                    >
                        <span>🔔</span>
                        <span className="hidden sm:inline">Bildirim Ayarları</span>
                    </Link>
                    <button
                        onClick={exportNotifications}
                        disabled={notifications.length === 0}
                        className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Bildirimleri dışa aktar"
                    >
                        <span>📤</span>
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        onClick={deleteReadNotifications}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                        title="Okunmuş bildirimleri sil"
                    >
                        <span>🗑️</span>
                        <span className="hidden sm:inline">Temizle</span>
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center"
                        disabled={loading}
                        title="Yenile"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
                <div className="flex-1">
                    <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                        🏷️ Bildirim Türü
                    </label>
                    <select
                        id="type-filter"
                        value={selectedType}
                        onChange={handleTypeChange}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 text-sm border"
                        disabled={loading}
                    >
                        <option value="">🔍 Tüm türler</option>
                        <option value="survey">📋 Anket</option>
                        <option value="comment">💬 Yorum</option>
                        <option value="system">⚙️ Sistem</option>
                        <option value="alert">⚠️ Uyarı</option>
                        <option value="info">ℹ️ Bilgi</option>
                        <option value="success">✅ Başarılı</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                        📊 Durum
                    </label>
                    <select
                        id="status-filter"
                        value={selectedStatus}
                        onChange={handleStatusChange}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 text-sm border"
                        disabled={loading}
                    >
                        <option value="">🔍 Tüm durumlar</option>
                        <option value="unread">📬 Okunmadı</option>
                        <option value="read">📭 Okundu</option>
                    </select>
                </div>
            </div>

            {/* No Results Message */}
            {notifications.length === 0 && !loading && (
                <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-3xl mb-2">🔔</div>
                    <p className="text-gray-600">Henüz bildirim bulunmuyor</p>
                    <p className="text-sm text-gray-500 mt-1">Yeni bildirimler burada görünecek</p>
                </div>
            )}

            {/* Desktop Table */}
            {notifications.length > 0 && (
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="py-3 px-4 text-left font-medium text-gray-600">Durum</th>
                            <th className="py-3 px-4 text-left font-medium text-gray-600">Tür</th>
                            <th className="py-3 px-4 text-left font-medium text-gray-600">Başlık</th>
                            <th className="py-3 px-4 text-left font-medium text-gray-600">Mesaj</th>
                            <th className="py-3 px-4 text-center font-medium text-gray-600">Tarih</th>
                            <th className="py-3 px-4 text-center font-medium text-gray-600">İşlem</th>
                        </tr>
                        </thead>
                        <tbody>
                        {notifications.map((item, idx) => (
                            <tr key={idx} className={`border-b hover:bg-gray-50 transition-colors ${
                                !item.isRead ? 'bg-blue-50' : ''
                            }`}>
                                <td className="py-3 px-4">
                                    <div className="flex items-center">
                                        {!item.isRead && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                        )}
                                        <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                                            item.isRead
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {item.isRead ? 'Okundu' : 'Okunmadı'}
                                        </span>
                                    </div>
                                </td>

                                <td className="py-3 px-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg">
                                            {getNotificationIcon(item.type)}
                                        </span>
                                        <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${getNotificationTypeStyle(item.type)}`}>
                                            {getNotificationTypeText(item.type)}
                                        </span>
                                    </div>
                                </td>

                                <td className="py-3 px-4 max-w-xs">
                                    <div className={`font-medium ${!item.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {item.title || 'Başlık yok'}
                                    </div>
                                </td>

                                <td className="py-3 px-4 max-w-md">
                                    {item.message ? (
                                        <div>
                                            <span className="block text-gray-700">
                                                {expandedRows.has(idx)
                                                    ? item.message
                                                    : truncateMessage(item.message)
                                                }
                                            </span>
                                            {item.message.length > 80 && (
                                                <button
                                                    onClick={() => toggleRow(idx)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs mt-1"
                                                >
                                                    {expandedRows.has(idx) ? 'Daha az' : 'Devamını oku'}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">Mesaj yok</span>
                                    )}
                                </td>

                                <td className="py-3 px-4 text-center text-gray-600 text-xs">
                                    {formatFullDate(item.createdAt)}
                                </td>

                                <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                        <button
                                            onClick={() => handleDetailClick(item)}
                                            className="bg-blue-100 hover:bg-blue-200 text-blue-600 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                                            title="Detay"
                                        >
                                            <span>👁️</span>
                                            <span>Detay</span>
                                        </button>
                                        {!item.isRead && (
                                            <button
                                                onClick={() => markAsRead(item.id)}
                                                className="bg-green-100 hover:bg-green-200 text-green-600 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                                                title="Okundu İşaretle"
                                            >
                                                <span>✅</span>
                                                <span>Okundu</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(item.id)}
                                            className="bg-red-100 hover:bg-red-200 text-red-600 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                                            title="Sil"
                                        >
                                            <span>🗑️</span>
                                            <span>Sil</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Mobile Cards */}
            {notifications.length > 0 && (
                <div className="md:hidden space-y-4">
                    {notifications.map((item, idx) => (
                        <div key={idx} className={`bg-white border-l-4 border rounded-lg shadow-sm overflow-hidden ${
                            !item.isRead
                                ? 'border-l-blue-500 bg-blue-50'
                                : 'border-l-gray-300 bg-gray-50'
                        }`}>
                            {/* Card Header */}
                            <div className="px-3 sm:px-4 py-3 border-b border-gray-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                                        <div className="flex-shrink-0 mt-1">
                                            <span className="text-xl">
                                                {getNotificationIcon(item.type)}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${getNotificationTypeStyle(item.type)}`}>
                                                    {getNotificationTypeText(item.type)}
                                                </span>
                                                <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                                                    item.isRead
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {item.isRead ? 'Okundu' : 'Okunmadı'}
                                                </span>
                                            </div>
                                            <h4 className={`font-medium text-sm truncate ${
                                                !item.isRead ? 'text-gray-900' : 'text-gray-600'
                                            }`}>
                                                {item.title || 'Başlık yok'}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                        {!item.isRead && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-3 sm:p-4">
                                {/* Message Section */}
                                <div className="mb-3">
                                    {item.message ? (
                                        <div className="bg-white p-3 rounded-lg border">
                                            <p className="text-sm text-gray-700 leading-relaxed break-words">
                                                {expandedRows.has(idx) ? item.message : truncateMessage(item.message, 120)}
                                            </p>
                                            {item.message.length > 120 && (
                                                <button
                                                    onClick={() => toggleRow(idx)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs mt-2 font-medium"
                                                >
                                                    {expandedRows.has(idx) ? '🔼 Daha az göster' : '🔽 Devamını oku'}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-white p-3 rounded-lg border">
                                            <span className="text-gray-400 italic text-sm">Mesaj bulunmuyor</span>
                                        </div>
                                    )}
                                </div>

                                {/* Date and Actions */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <div className="text-xs text-gray-500 flex items-center min-w-0">
                                        <span>📅</span>
                                        <span className="ml-1 truncate">
                                            {formatFullDate(item.createdAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                        <button
                                            onClick={() => handleDetailClick(item)}
                                            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 shadow-sm"
                                        >
                                            <span>👁️</span>
                                            <span className="hidden xs:inline">Detay</span>
                                        </button>
                                        {!item.isRead && (
                                            <button
                                                onClick={() => markAsRead(item.id)}
                                                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 shadow-sm"
                                            >
                                                <span>✅</span>
                                                <span className="hidden xs:inline">Okundu</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(item.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 shadow-sm"
                                        >
                                            <span>🗑️</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            <Pagination />

            {/* Bottom Stats */}
            {notifications.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 text-sm text-gray-600">
                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                            <span className="break-words">
                                Toplam {totalNotifications} bildirim
                            </span>
                            <div className="flex items-center space-x-1">
                                <span>🔔</span>
                                <span className="text-blue-600 font-medium">Gerçek Zamanlı Bildirimler</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end space-x-4">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-yellow-500 rounded mr-1"></div>
                                <span className="text-xs sm:text-sm">
                                    Okunmadı: {notifications.filter(d => !d.isRead).length}
                                </span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded mr-1"></div>
                                <span className="text-xs sm:text-sm">
                                    Okundu: {notifications.filter(d => d.isRead).length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsDisplay;