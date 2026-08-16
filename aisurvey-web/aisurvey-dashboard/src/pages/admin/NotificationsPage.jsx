
// src/pages/admin/NotificationsPage.jsx
import React, { useState, useEffect } from 'react';
import NotificationsTable from '../../components/dashboard/NotificationsTable';

export default function NotificationsPage() {
    const [userCompanyId, setUserCompanyId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // User bilgisini localStorage'dan al
        const getUserCompanyId = () => {
            try {
                const userData = localStorage.getItem('user');
                const token = localStorage.getItem('token');

                if (userData) {
                    const user = JSON.parse(userData);
                    return user.companyId;
                }

                // Eğer user object'inde yoksa token'dan decode et
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    return payload.companyId;
                }

                return null;
            } catch (error) {
                console.error('User company ID alınamadı:', error);
                return null;
            }
        };

        const companyId = getUserCompanyId();

        if (companyId) {
            setUserCompanyId(companyId);
            setLoading(false);
        } else {
            setError('Kullanıcı bilgisi bulunamadı');
            setLoading(false);
        }
    }, []);

    // Loading durumu
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-500">Bildirimler yükleniyor...</p>
                </div>
            </div>
        );
    }

    // Error durumu
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center bg-white p-8 rounded-xl shadow-md">
                    <div className="text-4xl mb-4">❌</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Hata Oluştu</h2>
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        🔄 Sayfayı Yenile
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                        <span className="text-white text-xl">🔔</span>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">
                                            Bildirimler
                                        </h1>
                                        <p className="text-sm text-gray-500">
                                            Sistem bildirimleri ve güncellemeler
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center space-x-3">
                                <div className="hidden sm:flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                                    <span className="text-blue-600 text-sm">🔄</span>
                                    <span className="text-blue-600 text-sm font-medium">Otomatik Yenileme</span>
                                </div>
                                <button
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                                    onClick={() => window.location.reload()}
                                >
                                    <span>🔄</span>
                                    <span className="hidden sm:inline">Yenile</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-8">
                    {/* Notifications Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-l-blue-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Toplam Bildirim</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        <span id="total-notifications">-</span>
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 text-xl">📊</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-l-yellow-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Okunmadı</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        <span id="unread-notifications">-</span>
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <span className="text-yellow-600 text-xl">📬</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-l-green-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Bu Hafta</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        <span id="weekly-notifications">-</span>
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-green-600 text-xl">📅</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notifications Table */}
                    <NotificationsTable
                        companyId={userCompanyId}
                        title="Bildirim Yönetimi"
                        initialLimit={10}
                    />

                    {/* Info Footer */}
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-start space-x-3">
                            <span className="text-blue-600 text-xl">💡</span>
                            <div>
                                <h4 className="font-medium text-blue-900 mb-2">Bildirim Sistemi Hakkında</h4>
                                <div className="text-sm text-blue-700 space-y-1">
                                    <p>• Bildirimler gerçek zamanlı olarak güncellenir</p>
                                    <p>• Yeni yorumlar ve sistem güncellemeleri otomatik bildirim gönderir</p>
                                    <p>• Önemli bildirimleri kaçırmamak için email bildirimlerini açabilirsiniz</p>
                                    <p>• Eski bildirimler otomatik olarak 30 gün sonra silinir</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
