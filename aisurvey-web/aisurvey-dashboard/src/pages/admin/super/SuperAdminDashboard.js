import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Users, Building2, FileText, MessageSquare, AlertTriangle, PauseCircle,
    RefreshCw, ScrollText, ShieldAlert
} from 'lucide-react';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { ROLE_LABELS } from '../../../utils/roles';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

// Tailwind sınıfları statik olmalı (JIT purge dinamik string'i göremez).
const TONES = {
    indigo: 'bg-indigo-100 text-indigo-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700'
};

const Card = ({ icon: Icon, label, value, tone = 'indigo', to }) => {
    const body = (
        <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition">
            <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${TONES[tone]}`}>
                <Icon size={22} />
            </span>
            <div>
                <div className="text-2xl font-semibold text-gray-900">{value ?? '-'}</div>
                <div className="text-sm text-gray-600">{label}</div>
            </div>
        </div>
    );
    return to ? <Link to={to}>{body}</Link> : body;
};

/**
 * Süper admin paneli. Şirkete ait ölçümler (memnuniyet ortalaması, yorumlar,
 * duygu analizi) burada yer almaz; site geneli sayılar gösterilir.
 */
export default function SuperAdminDashboard() {
    const [stats, setStats] = useState(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = useCallback(() => {
        setLoading(true);
        Promise.all([
            axios.get(`${API_BASE_URL}/admin/stats`, { headers: authHeader() }),
            axios.get(`${API_BASE_URL}/admin/notifications/unread-count`, { headers: authHeader() })
        ])
            .then(([statsRes, unreadRes]) => {
                setStats(statsRes.data);
                setUnreadMessages(unreadRes.data.unreadCount || 0);
                setError(null);
            })
            .catch(err => {
                console.error('Süper admin istatistikleri alınamadı:', err);
                setError('İstatistikler yüklenemedi.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 p-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                <p className="text-sm text-gray-600">Panel yükleniyor...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-7xl p-6">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                    <button onClick={fetchStats} className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500">
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    const roleCounts = stats?.usersByRole || {};
    // Eksen etiketi gün/ay; 30 tam tarih yan yana sığmıyor.
    const daily = (stats?.daily || []).map(point => ({
        ...point,
        label: point.date.slice(8) + '.' + point.date.slice(5, 7)
    }));

    return (
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Site Yönetim Paneli</h1>
                <button
                    onClick={fetchStats}
                    className="ml-auto inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <RefreshCw size={16} />
                    <span>Yenile</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card icon={Users} label="Kayıtlı kullanıcı" value={stats?.totalUsers} to="/admin/super/users" />
                <Card icon={Building2} label="Kayıtlı şirket" value={stats?.totalCompanies} />
                <Card icon={FileText} label="Toplam anket" value={stats?.totalSurveys} to="/admin/super/surveys" />
                <Card icon={MessageSquare} label="Anket doldurulma sayısı" value={stats?.totalResponses} />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card icon={FileText} label="Yayındaki anket" value={stats?.activeSurveys} />
                <Card icon={AlertTriangle} tone="amber" label="Uyarılı anket" value={stats?.warnedSurveys} to="/admin/super/surveys" />
                <Card icon={PauseCircle} tone="red" label="Askıya alınmış anket" value={stats?.suspendedSurveys} to="/admin/super/surveys" />
            </div>

            {/* Zaman serisi: toplam sayılar büyümenin hızını göstermiyordu. */}
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Son 30 gün</h2>
                {daily.length === 0 ? (
                    <p className="text-sm text-gray-600">Gösterilecek veri yok.</p>
                ) : (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="users" name="Yeni kayıt"
                                      stroke="#4f46e5" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="responses" name="Anket doldurma"
                                      stroke="#059669" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-900 mb-3">Rollere göre kullanıcılar</h2>
                    <ul className="divide-y divide-gray-100 text-sm">
                        {Object.entries(roleCounts).map(([role, count]) => (
                            <li key={role} className="flex items-center justify-between py-2">
                                <span className="text-gray-700">{ROLE_LABELS[role] || role}</span>
                                <span className="font-semibold text-gray-900">{count}</span>
                            </li>
                        ))}
                        <li className="flex items-center justify-between py-2">
                            <span className="text-gray-700">Son 7 günde kaydolan</span>
                            <span className="font-semibold text-gray-900">{stats?.newUsersLast7Days}</span>
                        </li>
                        <li className="flex items-center justify-between py-2">
                            <span className="text-gray-700">Aktif hesap</span>
                            <span className="font-semibold text-gray-900">{stats?.activeUsers}</span>
                        </li>
                    </ul>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-900 mb-3">Bekleyen işler</h2>
                    <div className="space-y-2">
                        <Link
                            to="/admin/super/messages"
                            className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-3 hover:bg-gray-50"
                        >
                            <span className="flex items-center gap-2 text-sm text-gray-700">
                                <MessageSquare size={16} className="text-indigo-600" />
                                Okunmamış şirket mesajı
                            </span>
                            <span className="font-semibold text-gray-900">{unreadMessages}</span>
                        </Link>
                        <Link
                            to="/admin/super/surveys"
                            className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-3 hover:bg-gray-50"
                        >
                            <span className="flex items-center gap-2 text-sm text-gray-700">
                                <ShieldAlert size={16} className="text-amber-600" />
                                Uyarı takibindeki anket
                            </span>
                            <span className="font-semibold text-gray-900">{stats?.warnedSurveys}</span>
                        </Link>
                        <Link
                            to="/admin/super/logs"
                            className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-3 hover:bg-gray-50"
                        >
                            <span className="flex items-center gap-2 text-sm text-gray-700">
                                <ScrollText size={16} className="text-gray-600" />
                                Site loglarını incele
                            </span>
                            <span className="text-sm text-indigo-600">Aç</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
