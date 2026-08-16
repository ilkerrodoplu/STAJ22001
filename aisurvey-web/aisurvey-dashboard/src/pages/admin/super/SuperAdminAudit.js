import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, ChevronLeft, ClipboardList, RefreshCw, Search as SearchIcon } from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

const formatTime = (value) =>
    value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' }) : '-';

/**
 * Ayrıntı sunucuda "alan: eski → yeni" satırlarının ";" ile birleşimi olarak yazılır.
 * Değeri olmayan serbest açıklamalar ({text}) olduğu gibi gösterilir.
 */
const parseDetail = (detail) => (detail || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
        const match = part.match(/^(.+?): ([\s\S]*) → ([\s\S]*)$/);
        return match ? { label: match[1], before: match[2], after: match[3] } : { text: part };
    });

/** İşlem adları kod tarafında sabit; ekranda okunur karşılıkları. */
const ACTION_LABELS = {
    ANKET_UYARILDI: 'Anket uyarıldı',
    ANKET_UYARISI_KALDIRILDI: 'Anket uyarısı kaldırıldı',
    ANKET_ASKIYA_ALINDI: 'Anket askıya alındı',
    ANKET_YAYINA_ALINDI: 'Anket yayına alındı',
    ANKET_SILINDI: 'Anket silindi',
    ANKET_DUZELTMESI_GONDERILDI: 'Anket düzeltmesi gönderildi',
    ANKET_OLUSTURULDU: 'Anket oluşturuldu',
    ANKET_GUNCELLENDI: 'Anket değiştirildi',
    ANKET_PASIFE_ALINDI: 'Anket pasife alındı',
    SIRKET_TURU_DEGISTI: 'Şirket türü değişti',
    SIRKET_SAHIBI_DEGISTI: 'Şirket sahibi değişti',
    SIRKET_DURUMU_DEGISTI: 'Şirket durumu değişti',
    SIRKET_BILGILERI_GUNCELLENDI: 'Şirket bilgileri değişti',
    KULLANICI_DURUMU_DEGISTI: 'Kullanıcı durumu değişti',
    KULLANICI_BILGILERI_GUNCELLENDI: 'Kullanıcı bilgileri değişti',
    ROL_ATANDI: 'Rol atandı',
    CALISAN_CIKARILDI: 'Çalışan çıkarıldı'
};

const ACTION_STYLES = {
    ANKET_ASKIYA_ALINDI: 'bg-red-100 text-red-800',
    ANKET_SILINDI: 'bg-red-100 text-red-800',
    SIRKET_DURUMU_DEGISTI: 'bg-red-100 text-red-800',
    KULLANICI_DURUMU_DEGISTI: 'bg-red-100 text-red-800',
    CALISAN_CIKARILDI: 'bg-red-100 text-red-800',
    ANKET_UYARILDI: 'bg-amber-100 text-amber-800',
    ANKET_PASIFE_ALINDI: 'bg-amber-100 text-amber-800',
    ANKET_YAYINA_ALINDI: 'bg-green-100 text-green-800',
    ANKET_UYARISI_KALDIRILDI: 'bg-green-100 text-green-800',
    ANKET_OLUSTURULDU: 'bg-green-100 text-green-800',
    ANKET_GUNCELLENDI: 'bg-blue-100 text-blue-800',
    ANKET_DUZELTMESI_GONDERILDI: 'bg-blue-100 text-blue-800',
    SIRKET_BILGILERI_GUNCELLENDI: 'bg-blue-100 text-blue-800',
    KULLANICI_BILGILERI_GUNCELLENDI: 'bg-blue-100 text-blue-800'
};

/** Üstteki hızlı filtre: kayıtlar anket / şirket / kullanıcı olarak ayrılır. */
const SCOPES = [
    { value: 'ALL', label: 'Tümü', match: () => true },
    { value: 'ANKET', label: 'Anketler', match: (action) => action.startsWith('ANKET') },
    { value: 'SIRKET', label: 'Şirketler', match: (action) => action.startsWith('SIRKET') },
    {
        value: 'KULLANICI',
        label: 'Kullanıcılar',
        match: (action) => action.startsWith('KULLANICI') || action === 'ROL_ATANDI'
            || action === 'CALISAN_CIKARILDI'
    }
];

/**
 * İşlem denetim kaydı: kim hangi anketi uyardı/askıya aldı, kim rol değiştirdi.
 * Uygulama logundan farkı, log rotasyonuyla silinmemesi (kayıtlar 1 yıl durur).
 */
export default function SuperAdminAudit() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [scope, setScope] = useState('ALL');
    const [openId, setOpenId] = useState(null);

    const fetchLogs = () => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/admin/audit-logs`, { headers: authHeader() })
            .then(res => { setLogs(res.data || []); setError(null); })
            .catch(err => {
                console.error('Denetim kaydı yüklenemedi:', err);
                setError('Denetim kaydı yüklenemedi.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(fetchLogs, []);

    const term = search.trim().toLowerCase();
    const matchScope = (SCOPES.find(item => item.value === scope) || SCOPES[0]).match;
    const filtered = logs
        .filter(entry => matchScope(entry.action || ''))
        .filter(entry => !term || [entry.actorEmail, entry.target, entry.detail,
            ACTION_LABELS[entry.action] || entry.action]
            .some(field => (field || '').toLowerCase().includes(term)));

    return (
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <Link
                    to="/admin/super/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                    <span>Geri</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">İşlem Kayıtları</h1>
                <button
                    onClick={fetchLogs}
                    className="ml-auto inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    <span>Yenile</span>
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200">
                    <div className="relative w-full sm:max-w-md">
                        <input
                            type="text"
                            placeholder="İşlem, kişi ya da kayıt ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon size={18} />
                        </div>
                    </div>
                    <select
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {SCOPES.map(item => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>
                    <span className="ml-auto text-sm text-gray-600">{filtered.length} kayıt</span>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-10">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                        <p className="text-sm text-gray-600">Kayıtlar yükleniyor...</p>
                    </div>
                ) : error ? (
                    <p className="p-4 text-sm text-red-600">{error}</p>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                        <ClipboardList size={32} strokeWidth={1} className="text-gray-400" />
                        <p className="text-sm text-gray-600">Kayıt bulunamadı.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Zaman</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Kim</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">İşlem</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Kayıt</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Ayrıntı</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Değişiklik</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                            {filtered.map(entry => (
                                <React.Fragment key={entry.id}>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                            {formatTime(entry.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {entry.actorEmail}
                                            <div className="text-xs text-gray-500">{entry.actorName || ''}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                ACTION_STYLES[entry.action] || 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {ACTION_LABELS[entry.action] || entry.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{entry.target || '-'}</td>
                                        {/* Soru değişikliklerinde ayrıntı uzun olabiliyor; tek satırda kalsın, tamamı yandaki butonla açılsın. */}
                                        <td className="px-4 py-3 max-w-xs truncate text-gray-700" title={entry.detail || ''}>
                                            {entry.detail || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {entry.detail ? (
                                                <button
                                                    onClick={() => setOpenId(openId === entry.id ? null : entry.id)}
                                                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                                >
                                                    <ChevronDown
                                                        size={14}
                                                        className={openId === entry.id ? 'rotate-180 transition-transform' : 'transition-transform'}
                                                    />
                                                    <span>{openId === entry.id ? 'Gizle' : 'Gör'}</span>
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                    {openId === entry.id && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={6} className="px-4 py-3">
                                                <ul className="space-y-2">
                                                    {parseDetail(entry.detail).map((line, index) => (
                                                        <li key={index} className="text-sm break-words">
                                                            {line.text ? (
                                                                <span className="text-gray-700">{line.text}</span>
                                                            ) : (
                                                                <>
                                                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                                        {line.label}
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-2 text-gray-800">
                                                                        <span className="rounded bg-red-50 px-2 py-0.5 text-red-700 line-through">
                                                                            {line.before}
                                                                        </span>
                                                                        <span className="text-gray-400">→</span>
                                                                        <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">
                                                                            {line.after}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
