import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Building2, ChevronLeft, Eye, Search as SearchIcon } from 'lucide-react';
import DetailModal from '../../../components/ui/DetailModal';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

/** Sahiplik devrinde listede olmayan kişiyi e-postayla girme seçeneği. */
const OTHER = '__other__';

const STATUS_STYLES = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-200 text-gray-700',
    SUSPENDED: 'bg-red-100 text-red-800'
};

/** Süper adminin seçebildiği durumlar; INACTIVE şirketi sahibi kendisi kapatır. */
const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Aktif' },
    { value: 'SUSPENDED', label: 'Donduruldu' }
];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('tr-TR') : '-');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('tr-TR') : '-');

/**
 * Süper admin şirket yönetimi. Şirketin bilgilerini şirket sahibi düzenler;
 * buradan yalnızca şirket türü değiştirilebilir (tür hazır anket kalıplarını ve
 * masa bazlı QR'ı belirlediği için sahibe kapalıdır).
 */
export default function SuperAdminCompanies() {
    const [companies, setCompanies] = useState([]);
    const [companyTypes, setCompanyTypes] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        axios.get(`${API_BASE_URL}/admin/companies`, { headers: authHeader() })
            .then(res => setCompanies(res.data || []))
            .catch(err => {
                console.error('Şirketler yüklenirken hata:', err);
                setError('Şirketler yüklenemedi.');
            })
            .finally(() => setLoading(false));

        axios.get(`${API_BASE_URL}/company/types`)
            .then(res => setCompanyTypes(res.data || []))
            .catch(() => setCompanyTypes([]));

        // Sahiplik devri listesi buradan beslenir; ayrı bir uç açmaya gerek yok.
        axios.get(`${API_BASE_URL}/admin/users`, { headers: authHeader() })
            .then(res => setUsers(res.data || []))
            .catch(() => setUsers([]));
    }, []);

    const patch = (companyId, fields) =>
        setCompanies(prev => prev.map(c => (c.id === companyId ? { ...c, ...fields } : c)));

    /**
     * Yeni sahip listeden seçilir; listede olmayan biri için "Diğer" seçilip
     * e-posta yazılır. Kullanıcı başka şirketteyse backend onu bu şirkete taşır,
     * kendi şirketinin sahibiyse devri reddeder.
     */
    const transferOwnership = async (company, secim) => {
        let payload;
        let hedef;

        if (secim === OTHER) {
            const email = (window.prompt('Yeni sahibin e-posta adresi:') || '').trim();
            if (!email) return;
            payload = { email };
            hedef = email;
        } else {
            const yeni = users.find(u => u.id === secim);
            if (!yeni) return;
            payload = { userId: secim };
            hedef = yeni.email;
        }

        if (!window.confirm(
            `${company.name} şirketinin sahipliği ${hedef} hesabına devredilsin mi? `
            + 'Eski sahip çalışan olarak kalır.')) {
            return;
        }

        try {
            const res = await axios.put(`${API_BASE_URL}/admin/companies/${company.id}/owner`,
                payload, { headers: authHeader() });
            patch(company.id, { ownerName: res.data.ownerName, ownerEmail: res.data.ownerEmail });
            // Rol ve şirket değişmiş olabilir; devir listesi eski hâli göstermesin.
            setUsers(prev => prev.map(u => {
                if (u.email === res.data.ownerEmail) {
                    return { ...u, companyId: company.id, roles: ['COMPANY_OWNER'] };
                }
                if (u.companyId !== company.id) return u;
                return u.roles?.includes('COMPANY_OWNER') ? { ...u, roles: ['COMPANY_STAFF'] } : u;
            }));
            toast.success('Sahiplik devredildi');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Sahiplik devredilemedi');
        }
    };

    /** Durum seçme panelinden gelir; aynı durum yeniden seçilirse istek atılmaz. */
    const changeStatus = async (company, status) => {
        if (status === company.status) return;
        const suspended = status === 'SUSPENDED';
        if (!window.confirm(suspended
            ? `${company.name} dondurulsun mu? Kullanıcıları giriş yapamaz, anketleri yanıt kabul etmez.`
            : `${company.name} yeniden aktifleştirilsin mi?`)) {
            return;
        }
        try {
            const res = await axios.put(`${API_BASE_URL}/admin/companies/${company.id}/status`,
                { suspended }, { headers: authHeader() });
            patch(company.id, { status: res.data.status });
            toast.success(suspended ? 'Şirket donduruldu' : 'Şirket yeniden aktifleştirildi');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Şirket durumu değiştirilemedi');
        }
    };

    const changeType = async (company, companyType) => {
        try {
            const response = await axios.put(`${API_BASE_URL}/admin/companies/${company.id}/type`,
                { companyType }, { headers: authHeader() });
            // Sayaçlar tür ucunda hesaplanmıyor; satırın kalanı korunur.
            setCompanies(prev => prev.map(c => (c.id === company.id
                ? { ...c, companyType: response.data.companyType, companyTypeLabel: response.data.companyTypeLabel }
                : c)));
            toast.success('Şirket türü güncellendi');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Şirket türü değiştirilemedi');
        }
    };

    const term = search.trim().toLowerCase();
    const filtered = term
        ? companies.filter(c => [c.name, c.email, c.ownerEmail, c.ownerName]
            .some(field => (field || '').toLowerCase().includes(term)))
        : companies;

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
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Şirket Yönetimi</h1>
                <span className="ml-auto text-sm text-gray-600">{filtered.length} şirket</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                    <div className="relative w-full sm:max-w-md">
                        <input
                            type="text"
                            placeholder="Şirket adı, e-posta veya sahip ara..."
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
                        <p className="text-sm text-gray-600">Şirketler yükleniyor...</p>
                    </div>
                ) : error ? (
                    <p className="p-4 text-sm text-red-600">{error}</p>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                        <Building2 size={32} strokeWidth={1} className="text-gray-400" />
                        <p className="text-sm text-gray-600">Şirket bulunamadı.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Şirket</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Sahibi</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Şirket Türü</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Kullanıcı</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Anket</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Durum</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Kayıt</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Ayrıntı</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                            {filtered.map(company => (
                                <tr key={company.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{company.name || '-'}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {/* Sahibini kaybeden şirket sahipsiz kalmasın diye devir buradan. */}
                                        <select
                                            value={users.find(u => u.email === company.ownerEmail)?.id || ''}
                                            onChange={(e) => transferOwnership(company, e.target.value)}
                                            className="w-44 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                        >
                                            {!company.ownerEmail && <option value="">Sahipsiz</option>}
                                            {users.filter(u => u.companyId === company.id).map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.email}
                                                </option>
                                            ))}
                                            <option value={OTHER}>Diğer (e-posta gir)…</option>
                                        </select>
                                        <div className="text-xs text-gray-500">{company.ownerName || ''}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {/* Şirket türünü yalnızca süper admin değiştirebilir. */}
                                        <select
                                            value={company.companyType || ''}
                                            onChange={(e) => changeType(company, e.target.value)}
                                            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                                        >
                                            {!company.companyType && <option value="">Belirtilmemiş</option>}
                                            {companyTypes.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{company.userCount}</td>
                                    <td className="px-4 py-3 text-gray-700">{company.surveyCount}</td>
                                    <td className="px-4 py-3">
                                        {/* Şirket düzeyinde yaptırım: durum panelden seçilir. */}
                                        <select
                                            value={company.status || ''}
                                            onChange={(e) => changeStatus(company, e.target.value)}
                                            title="Dondurulan şirkette giriş ve anket yanıtı durur"
                                            className={`rounded-md border border-gray-300 px-2 py-1 text-xs font-medium ${
                                                STATUS_STYLES[company.status] || 'bg-gray-200 text-gray-700'
                                            }`}
                                        >
                                            {/* Sahibinin kapattığı şirket (INACTIVE) buradan seçilemez. */}
                                            {!STATUS_OPTIONS.some(option => option.value === company.status) && (
                                                <option value={company.status || ''}>{company.status || '-'}</option>
                                            )}
                                            {STATUS_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{formatDate(company.createdAt)}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setDetail(company)}
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
                    title={detail.name}
                    onClose={() => setDetail(null)}
                    rows={[
                        ['Şirket ID', detail.id],
                        ['Adı', detail.name],
                        ['Açıklama', detail.description],
                        ['Şirket türü', detail.companyTypeLabel],
                        ['Tür açıklaması', detail.companyTypeOther],
                        ['Durum', detail.status],
                        ['Sahibi', detail.ownerName],
                        ['Sahip e-postası', detail.ownerEmail],
                        ['Telefon', detail.phone],
                        ['E-posta', detail.email],
                        ['Adres', detail.address],
                        ['Web sitesi', detail.website],
                        ['Logo adresi', detail.logoUrl],
                        ['Kullanıcı sayısı', detail.userCount],
                        ['Anket sayısı', detail.surveyCount],
                        ['Kayıt tarihi', formatDateTime(detail.createdAt)],
                        ['Son güncelleme', formatDateTime(detail.updatedAt)]
                    ]}
                />
            )}
        </div>
    );
}
