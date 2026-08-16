import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ChevronLeft, Eye, Search as SearchIcon, Users } from 'lucide-react';
import { roleLabel } from '../../../utils/roles';
import DetailModal from '../../../components/ui/DetailModal';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('tr-TR') : '-');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('tr-TR') : '-');

const STATUS_STYLES = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-200 text-gray-700',
    SUSPENDED: 'bg-red-100 text-red-800'
};

/** Süper adminin seçebildiği durumlar; INACTIVE hesabı kullanıcı kendisi kapatır. */
const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Aktif' },
    { value: 'SUSPENDED', label: 'Donduruldu' }
];

/** Süper admin: sistemdeki tüm kayıtlı kullanıcılar. */
export default function SuperAdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    // Satırdaki küçük buton kullanıcının tüm bilgilerini açar.
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        axios.get(`${API_BASE_URL}/admin/users`, { headers: authHeader() })
            .then(res => setUsers(res.data || []))
            .catch(err => {
                console.error('Kullanıcılar yüklenirken hata:', err);
                setError('Kullanıcılar yüklenemedi.');
            })
            .finally(() => setLoading(false));
    }, []);

    /**
     * Kullanıcı düzeyinde yaptırım. Dondurulan hesap şifresiyle geri alınamaz.
     * Durum seçme panelinden gelir; aynı durum yeniden seçilirse istek atılmaz.
     */
    const changeStatus = async (user, status) => {
        if (status === user.status) return;
        const suspended = status === 'SUSPENDED';
        if (!window.confirm(suspended
            ? `${user.email} dondurulsun mu? Giriş yapamaz ve hesabını kendisi geri alamaz.`
            : `${user.email} yeniden aktifleştirilsin mi?`)) {
            return;
        }
        try {
            const res = await axios.put(`${API_BASE_URL}/admin/users/${user.id}/status`,
                { suspended }, { headers: authHeader() });
            setUsers(prev => prev.map(u => (u.id === user.id ? res.data : u)));
            toast.success(suspended ? 'Hesap donduruldu' : 'Hesap yeniden aktifleştirildi');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Hesap durumu değiştirilemedi');
        }
    };

    const term = search.trim().toLowerCase();
    const filtered = term
        ? users.filter(u => [u.fullName, u.email, u.companyName]
            .some(field => (field || '').toLowerCase().includes(term)))
        : users;

    return (
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/admin/super/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                    <span>Geri</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Kayıtlı Kullanıcılar</h1>
                <span className="ml-auto text-sm text-gray-600">{filtered.length} kullanıcı</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                    <div className="relative w-full sm:max-w-md">
                        <input
                            type="text"
                            placeholder="Ad, e-posta veya firma ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon size={18} />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-10">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                        <p className="text-sm text-gray-600">Kullanıcılar yükleniyor...</p>
                    </div>
                ) : error ? (
                    <p className="p-4 text-sm text-red-600">{error}</p>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                        <Users size={32} strokeWidth={1} className="text-gray-400" />
                        <p className="text-sm text-gray-600">Kullanıcı bulunamadı.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Ad Soyad</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">E-posta</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Telefon</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Firma</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Rol</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Durum</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Kayıt Tarihi</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Ayrıntı</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                            {filtered.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{user.fullName || '-'}</td>
                                    <td className="px-4 py-3 text-gray-700">{user.email}</td>
                                    <td className="px-4 py-3 text-gray-700">{user.phone || '-'}</td>
                                    <td className="px-4 py-3 text-gray-700">{user.companyName || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                            {roleLabel(user.roles)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {/* Durum rozete tıklayarak değil, panelden seçilir. */}
                                        <select
                                            value={user.status || ''}
                                            onChange={(e) => changeStatus(user, e.target.value)}
                                            disabled={user.roles?.includes('ADMIN')}
                                            title={user.roles?.includes('ADMIN')
                                                ? 'Süper admin hesabı dondurulamaz'
                                                : 'Hesap durumunu değiştir'}
                                            className={`rounded-md border border-gray-300 px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 ${STATUS_STYLES[user.status] || 'bg-gray-200 text-gray-700'}`}
                                        >
                                            {/* Kullanıcının kendi kapattığı hesap (INACTIVE) buradan seçilemez. */}
                                            {!STATUS_OPTIONS.some(option => option.value === user.status) && (
                                                <option value={user.status || ''}>{user.status || '-'}</option>
                                            )}
                                            {STATUS_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{formatDate(user.createdAt)}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setDetail(user)}
                                            title="Tüm bilgileri gör"
                                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                        >
                                            <Eye size={14} />
                                            <span>Gör</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {detail && (
                <DetailModal
                    title={detail.fullName || detail.email}
                    onClose={() => setDetail(null)}
                    rows={[
                        ['Kullanıcı ID', detail.id],
                        ['Ad Soyad', detail.fullName],
                        ['E-posta', detail.email],
                        ['Telefon', detail.phone],
                        ['Adres', detail.address],
                        ['Rol', roleLabel(detail.roles)],
                        ['Tüm roller', (detail.roles || []).join(', ')],
                        ['Durum', detail.status],
                        ['Firma', detail.companyName],
                        ['Firma ID', detail.companyId],
                        ['Kayıt tarihi', formatDateTime(detail.createdAt)],
                        ['Son güncelleme', formatDateTime(detail.updatedAt)],
                        ['Pasife alınma', formatDateTime(detail.deactivatedAt)]
                    ]}
                />
            )}
        </div>
    );
}
