// src/pages/admin/CommentsPage.jsx
import React, { useState, useEffect } from 'react';
import CommentsTable from '../../components/dashboard/CommentsTable';

export default function CommentsPage() {
    const [userCompanyId, setUserCompanyId] = useState(null);
    const [loading, setLoading] = useState(true);

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
        setUserCompanyId(companyId);
        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div className="p-6 bg-gradient-to-bl from-gray-50 to-blue-50 min-h-screen">
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-500">Sayfa yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gradient-to-bl from-gray-50 to-blue-50 min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    💬 Müşteri Yorumları
                </h1>
                <p className="text-gray-600">
                    Doldurulan tüm anketler burada; yorum yazılmamış yanıtlarda da
                    "Cevaplar" ile verilen puanları görebilirsiniz
                </p>
            </div>

            {/* Comments Table */}
            <CommentsTable
                companyId={userCompanyId}
                title="Tüm Müşteri Yorumları"
                initialLimit={20}
            />
        </div>
    );
}