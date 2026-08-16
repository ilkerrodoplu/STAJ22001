import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ChevronLeft, Users, UserMinus, Check, X as XIcon, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isCompanyOwner, roleLabel, STAFF_ROLES } from '../../utils/roles';
import InviteCodeCard from '../../components/InviteCodeCard';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

/**
 * Şirket sahibinin çalışan yönetimi. Sahip çalışan hesabı açmaz; kayıt kodunu
 * paylaşır, çalışan kendi hesabını açar, sahip de rolünü belirler.
 */
export default function Employees() {
    const { user, userProfile } = useAuth();
    const owner = isCompanyOwner(user?.roles || userProfile?.roles);

    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [removeModal, setRemoveModal] = useState({ show: false, id: null, name: '' });
    // Sahip, onaylamadan önce başvuranın hesap bilgilerini görebilsin.
    const [detail, setDetail] = useState(null);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const staffRes = await axios.get(`${API_BASE_URL}/company/staff`, { headers: authHeader() });
            setStaff(staffRes.data || []);
            setError(null);
        } catch (err) {
            console.error('Çalışanlar yüklenirken hata:', err);
            setError('Çalışan bilgileri yüklenemedi.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (owner) fetchAll();
        else setLoading(false);
    }, [owner, fetchAll]);

    const changeRole = async (userId, role) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/company/staff/${userId}/role`,
                null, { headers: authHeader(), params: { role } });
            setStaff(prev => prev.map(s => (s.id === userId ? response.data : s)));
            toast.success('Rol güncellendi');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Rol güncellenemedi');
        }
    };

    /** Katılma isteği kararı: onaylanan çalışır, reddedilenin şirket bağı kurulmaz. */
    const decide = async (userId, action) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/company/staff/${userId}/${action}`,
                {}, { headers: authHeader() });
            setStaff(prev => action === 'approve'
                ? prev.map(s => (s.id === userId ? response.data : s))
                : prev.filter(s => s.id !== userId));
            toast.success(action === 'approve' ? 'Çalışan onaylandı' : 'İstek reddedildi');
        } catch (err) {
            toast.error(err.response?.data?.message || 'İşlem tamamlanamadı');
        }
    };

    const confirmRemove = async () => {
        try {
            await axios.delete(`${API_BASE_URL}/company/staff/${removeModal.id}`, { headers: authHeader() });
            setStaff(prev => prev.filter(s => s.id !== removeModal.id));
            toast.success('Çalışan şirketten çıkarıldı');
        } catch {
            toast.error('Çalışan çıkarılamadı');
        } finally {
            setRemoveModal({ show: false, id: null, name: '' });
        }
    };

    if (!owner) {
        return (
            <div className="mx-auto max-w-3xl p-6">
                <p className="text-sm text-gray-600">Bu sayfa yalnızca şirket sahibine açıktır.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/admin/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                    <span>Geri</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Çalışanlarım</h1>
            </div>

            {/* Kayıt kodu - yalnızca şirket sahibine görünür */}
            <InviteCodeCard
                path="/company/staff/invite-code"
                title="Çalışan Kayıt Kodu"
                description={'Bu kodu yalnızca siz görüyorsunuz. Çalışanlarınız kayıt ekranında ' +
                    '"Şirket Çalışanı"nı seçip bu kodu girerek şirketinize katılır.'}
                hint="Kod güvenlik için kısa sürede kendiliğinden değişir; çalışanınız kodu görür görmez girmelidir."
            />

            {/* Çalışan listesi ve rol atama */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Çalışanlar ve Rolleri</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Kodu girip kaydolan çalışan, siz onaylayana kadar yalnızca profil ve ayarlar
                        sayfalarını görür. Anket Editörü'nün yaptığı işler onay gerektirmez; size
                        bildirim olarak gelir.
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-10">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                        <p className="text-sm text-gray-600">Yükleniyor...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-between gap-3 p-4">
                        <p className="text-sm text-red-600">{error}</p>
                        <button
                            onClick={fetchAll}
                            className="rounded-md bg-indigo-600 px-3 py-2 text-white text-sm hover:bg-indigo-500"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                ) : staff.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                        <Users size={32} strokeWidth={1} className="text-gray-400" />
                        <p className="text-sm text-gray-600">
                            Henüz çalışanınız yok. Kayıt kodunu paylaşarak çalışanlarınızı davet edin.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Çalışan</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">E-posta</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Mevcut Rol</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Rol Ata</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">İşlem</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                            {staff.map((member) => (
                                <tr key={member.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {[member.firstName, member.lastName].filter(Boolean).join(' ') || '-'}
                                        {member.membershipStatus === 'PENDING' && (
                                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                                                Onay bekliyor
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{member.email}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                            {roleLabel(member.roles)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={STAFF_ROLES.find(r => (member.roles || []).includes(r.value))?.value || 'COMPANY_STAFF'}
                                            onChange={(e) => changeRole(member.id, e.target.value)}
                                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {STAFF_ROLES.map(role => (
                                                <option key={role.value} value={role.value} title={role.description}>
                                                    {role.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setDetail(member)}
                                                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50"
                                                title="Hesap bilgilerini gör"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        {member.membershipStatus === 'PENDING' ? (
                                            <>
                                                <button
                                                    onClick={() => decide(member.id, 'approve')}
                                                    className="inline-flex items-center gap-2 rounded-md border border-green-300 bg-white px-3 py-2 text-green-700 hover:bg-green-50"
                                                    title="Katılımı onayla"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => decide(member.id, 'reject')}
                                                    className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-amber-700 hover:bg-amber-50"
                                                    title="Reddet (hesap silinmez)"
                                                >
                                                    <XIcon size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setRemoveModal({
                                                    show: true,
                                                    id: member.id,
                                                    name: [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email
                                                })}
                                                className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-red-600 hover:bg-red-50"
                                                title="Şirketten çıkar"
                                            >
                                                <UserMinus size={16} />
                                            </button>
                                        )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <ul className="text-sm text-gray-600 space-y-1">
                        {STAFF_ROLES.map(role => (
                            <li key={role.value}>
                                <span className="font-medium text-gray-800">{role.label}:</span> {role.description}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Hesap bilgileri: sahip, onay kararını körlemesine vermesin. */}
            {detail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
                        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
                            <h3 className="text-base font-semibold text-gray-900">Hesap Bilgileri</h3>
                            <button
                                onClick={() => setDetail(null)}
                                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                                aria-label="Kapat"
                            >
                                <XIcon size={18} />
                            </button>
                        </div>

                        <dl className="divide-y divide-gray-100 px-4 py-2 text-sm">
                            {[
                                ['Ad Soyad', [detail.firstName, detail.lastName].filter(Boolean).join(' ')],
                                ['E-posta', detail.email],
                                ['Telefon', detail.phone],
                                ['Adres', detail.address],
                                ['Rol', roleLabel(detail.roles)],
                                ['Durum', detail.membershipStatus === 'PENDING' ? 'Onayınızı bekliyor' : 'Onaylı çalışan'],
                                ['Kayıt tarihi', detail.createdAt
                                    ? new Date(detail.createdAt).toLocaleString('tr-TR')
                                    : null]
                            ].map(([label, value]) => (
                                <div key={label} className="flex gap-3 py-2">
                                    <dt className="w-32 shrink-0 text-gray-500">{label}</dt>
                                    <dd className="text-gray-900 break-all">{value || '-'}</dd>
                                </div>
                            ))}
                        </dl>

                        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
                            <button
                                onClick={() => setDetail(null)}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Kapat
                            </button>
                            {detail.membershipStatus === 'PENDING' && (
                                <>
                                    <button
                                        onClick={() => { decide(detail.id, 'reject'); setDetail(null); }}
                                        className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                                    >
                                        <XIcon size={16} /> Reddet
                                    </button>
                                    <button
                                        onClick={() => { decide(detail.id, 'approve'); setDetail(null); }}
                                        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                                    >
                                        <Check size={16} /> Onayla
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {removeModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-900">Çalışanı çıkar</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            <strong>{removeModal.name}</strong> şirketinizden çıkarılacak. Hesabı silinmez;
                            hazırladığı anketler şirketinizde kalır ve sahipliği size geçer.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setRemoveModal({ show: false, id: null, name: '' })}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={confirmRemove}
                                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                            >
                                Çıkar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
