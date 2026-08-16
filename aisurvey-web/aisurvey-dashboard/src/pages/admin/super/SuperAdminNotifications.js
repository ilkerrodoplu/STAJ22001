import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, RefreshCw, AlertOctagon, MessageCircle, Building2, ShieldAlert, Globe } from 'lucide-react';
import { ROLE_LABELS } from '../../../utils/roles';
import { useNotifications } from '../../../hooks/useNotifications';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

const formatTime = (value) =>
    value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '';

/**
 * Süper adminin bildirimleri: şirketlerden gelen okunmamış mesajlar ve
 * loglardaki hata satırları. Şirket bildirimleri (yorum, anket yanıtı) burada yer almaz.
 */
export default function SuperAdminNotifications() {
    const [data, setData] = useState({ unreadMessages: [], errors: [], securityEvents: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { fetchUnreadCount } = useNotifications();
    /** İlk yüklemeden sonra bir kez işaretlenir; "Yenile" tekrar POST atmasın. */
    const markedRead = useRef(false);

    const fetchNotifications = useCallback(() => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/admin/notifications`, { headers: authHeader(), params: { errorLimit: 50 } })
            .then(res => {
                setData({
                    unreadMessages: res.data.unreadMessages || [],
                    errors: res.data.errors || [],
                    securityEvents: res.data.securityEvents || []
                });
                setError(null);
            })
            .catch(err => {
                console.error('Bildirimler yüklenemedi:', err);
                setError('Bildirimler yüklenemedi.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    // Bu sayfayı açmak bildirimleri okumaktır. Daha önce hiçbir yerden okundu
    // işareti gitmediği için zil rozeti hep dolu kalıyordu; listeyi aldıktan
    // sonra işaretliyoruz ki ekrandaki içerik boşalmasın, sayaç ise sıfırlansın.
    useEffect(() => {
        if (loading || markedRead.current) {
            return;
        }
        markedRead.current = true;
        axios.post(`${API_BASE_URL}/admin/notifications/mark-all-read`, {}, { headers: authHeader() })
            .then(() => fetchUnreadCount())
            .catch(err => console.error('Bildirimler okundu işaretlenemedi:', err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    return (
        <div className="mx-auto max-w-5xl p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <Link
                    to="/admin/super/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                    <span>Geri</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Bildirimler</h1>
                <button
                    onClick={fetchNotifications}
                    className="ml-auto inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    <span>Yenile</span>
                </button>
            </div>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {/* Okunmamış şirket mesajları */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 p-4">
                    <MessageCircle size={18} className="text-indigo-600" />
                    <h2 className="text-base font-semibold text-gray-900">Okunmamış Şirket Mesajları</h2>
                    <span className="ml-auto text-sm text-gray-600">{data.unreadMessages.length}</span>
                </div>

                {data.unreadMessages.length === 0 ? (
                    <p className="p-4 text-sm text-gray-600">Okunmamış mesaj yok.</p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {data.unreadMessages.map(message => (
                            <li key={message.id}>
                                <Link
                                    to="/admin/super/messages"
                                    className="flex items-start gap-3 p-4 hover:bg-gray-50"
                                >
                                    <Building2 size={16} className="mt-1 text-gray-400" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-900">
                                            {message.companyName || 'Bilinmeyen firma'}
                                            <span className="ml-2 text-xs font-normal text-gray-500">
                                                {message.senderName || message.senderEmail}
                                            </span>
                                        </div>
                                        <div className="mt-1 line-clamp-2 text-sm text-gray-700">{message.body}</div>
                                        <div className="mt-1 text-xs text-gray-400">{formatTime(message.createdAt)}</div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Yetkisiz erişim denemeleri */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 p-4">
                    <ShieldAlert size={18} className="text-amber-600" />
                    <h2 className="text-base font-semibold text-gray-900">Yetkisiz Erişim Denemeleri</h2>
                    <span className="ml-auto text-sm text-gray-600">{data.securityEvents.length}</span>
                </div>

                {data.securityEvents.length === 0 ? (
                    <p className="p-4 text-sm text-gray-600">Yetkisiz erişim denemesi yok.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Kim</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">IP</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Erişmek istediği</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Hangi sayfadan</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Tür</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Zaman</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                            {data.securityEvents.map(event => (
                                <tr key={event.id} className={event.read ? 'hover:bg-gray-50' : 'bg-amber-50'}>
                                    <td className="px-4 py-3">
                                        {event.userEmail ? (
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {event.userName || event.userEmail}
                                                </div>
                                                <div className="text-xs text-gray-500">{event.userEmail}</div>
                                                {event.roles?.length > 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        {event.roles.map(r => ROLE_LABELS[r] || r).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-gray-700">
                                                <Globe size={14} className="text-gray-400" />
                                                Kayıtsız ziyaretçi
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{event.ip || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs text-gray-900">
                                            {event.method} {event.path}
                                        </span>
                                        {event.reason && (
                                            <div className="mt-1 text-xs text-gray-500">{event.reason}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 max-w-xs truncate text-xs text-gray-700" title={event.page || ''}>
                                        {event.page || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                            event.type === 'FORBIDDEN'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-gray-200 text-gray-700'
                                        }`}>
                                            {event.type === 'FORBIDDEN' ? 'Yetki yetersiz' : 'Oturumsuz'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-700">{formatTime(event.createdAt)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Log hataları */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-200 p-4">
                    <AlertOctagon size={18} className="text-red-600" />
                    <h2 className="text-base font-semibold text-gray-900">Sistem Hataları (log)</h2>
                    <span className="ml-auto text-sm text-gray-600">{data.errors.length}</span>
                    <Link to="/admin/super/logs" className="ml-3 text-sm text-indigo-600 hover:underline">
                        Tüm loglar
                    </Link>
                </div>

                {data.errors.length === 0 ? (
                    <p className="p-4 text-sm text-gray-600">Log kaydında hata yok.</p>
                ) : (
                    <pre className="max-h-[45vh] overflow-auto rounded-b-lg bg-gray-900 p-4 text-xs leading-relaxed font-mono">
                        {data.errors.map((line, index) => (
                            <div key={index} className="whitespace-pre-wrap text-red-400">{line}</div>
                        ))}
                    </pre>
                )}
            </div>
        </div>
    );
}
