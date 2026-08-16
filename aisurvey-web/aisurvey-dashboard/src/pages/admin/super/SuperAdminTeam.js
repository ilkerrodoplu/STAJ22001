import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import InviteCodeCard from '../../../components/InviteCodeCard';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('tr-TR') : '-');

/**
 * Süper admin ekibi. Süper adminin eklediği çalışan da süper admin olur:
 * bu koda kaydolan kullanıcı şirkete bağlanmaz, ADMIN rolüyle açılır.
 */
export default function SuperAdminTeam() {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAll = useCallback(() => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/admin/admins`, { headers: authHeader() })
            .then(adminsRes => {
                setAdmins(adminsRes.data || []);
                setError(null);
            })
            .catch(err => {
                console.error('Süper admin ekibi yüklenemedi:', err);
                setError('Bilgiler yüklenemedi.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/admin/super/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                    <span>Geri</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Süper Admin Ekibi</h1>
            </div>

            <InviteCodeCard
                path="/admin/invite-code"
                title="Süper Admin Kayıt Kodu"
                description="Bu kodla kaydolan kişi de süper admin olur ve hiçbir şirkete bağlanmaz. Kod yalnızca güvendiğiniz kişilerle paylaşılmalıdır."
                hint="Kod kısa sürede kendiliğinden değişir; paylaştığınız kişi kodu hemen girmelidir."
            />

            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 p-4">
                    <ShieldCheck size={18} className="text-indigo-600" />
                    <h2 className="text-base font-semibold text-gray-900">Süper Adminler</h2>
                    <span className="ml-auto text-sm text-gray-600">{admins.length}</span>
                </div>

                {loading ? (
                    <p className="p-4 text-sm text-gray-600">Yükleniyor...</p>
                ) : error ? (
                    <p className="p-4 text-sm text-red-600">{error}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Ad Soyad</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">E-posta</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Durum</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Kayıt Tarihi</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                            {admins.map(admin => (
                                <tr key={admin.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{admin.fullName || '-'}</td>
                                    <td className="px-4 py-3 text-gray-700">{admin.email}</td>
                                    <td className="px-4 py-3 text-gray-700">{admin.status || '-'}</td>
                                    <td className="px-4 py-3 text-gray-700">{formatDate(admin.createdAt)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="border-t border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
                    Süper admin hesapları panelden kapatılamaz; kaldırma işlemi yalnızca veritabanı
                    üzerinden yapılır.
                </p>
            </div>
        </div>
    );
}
