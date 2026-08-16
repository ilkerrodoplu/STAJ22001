import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Save } from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

/** Ziyaretçinin gördüğü metinler; her biri /public/site-content ucundan okunur. */
const SECTIONS = [
    {
        key: 'privacyPolicy',
        label: 'Gizlilik Sözleşmesi',
        hint: 'Hangi verilerin toplandığı, ne kadar saklandığı ve kiminle paylaşıldığı.'
    },
    {
        key: 'termsOfService',
        label: 'Kullanım Şartları',
        hint: 'Hizmetin kuralları, hesap sorumlulukları ve yasaklı kullanımlar.'
    },
    {
        key: 'contactInfo',
        label: 'İletişim',
        hint: 'Adres, telefon, e-posta, çalışma saatleri.'
    }
];

const EMPTY = { privacyPolicy: '', termsOfService: '', contactInfo: '' };

const formatDate = (value) =>
    value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : null;

/**
 * Site yönetimi: sözleşme ve iletişim metinleri. Tek kayıt üzerinde çalışır,
 * kaydedilince ziyaretçiye açık uçtan da aynı metin döner.
 */
export default function SuperAdminSite() {
    const [form, setForm] = useState(EMPTY);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(false);

    const fetchContent = useCallback(() => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/admin/site-content`, { headers: authHeader() })
            .then(res => {
                // Hiç kaydedilmemiş alanlar null gelir; textarea kontrollü kalsın diye boş metne çevrilir.
                setForm({ ...EMPTY, ...Object.fromEntries(
                    SECTIONS.map(({ key }) => [key, res.data?.[key] || ''])) });
                setUpdatedAt(res.data?.updatedAt || null);
                setError(null);
            })
            .catch(err => {
                console.error('Site metinleri yüklenemedi:', err);
                setError('Metinler yüklenemedi.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchContent(); }, [fetchContent]);

    const handleChange = (key) => (e) => {
        setForm({ ...form, [key]: e.target.value });
        setSaved(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        axios.put(`${API_BASE_URL}/admin/site-content`, form, { headers: authHeader() })
            .then(res => {
                setUpdatedAt(res.data?.updatedAt || null);
                setSaved(true);
            })
            .catch(err => {
                console.error('Site metinleri kaydedilemedi:', err);
                setError(err.response?.status === 400
                    ? 'Metinlerden biri çok uzun (en fazla 50.000 karakter).'
                    : 'Kaydedilemedi, lütfen tekrar deneyin.');
            })
            .finally(() => setSaving(false));
    };

    return (
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/admin/super/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                    <span>Geri</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Site Yönetimi</h1>
            </div>

            <p className="mb-4 text-sm text-gray-600">
                Bu metinler ziyaretçilere gösterilir. Boş bıraktığınız bölüm silinmez, önceki hâliyle kalır.
                {updatedAt && <> Son güncelleme: <strong>{formatDate(updatedAt)}</strong>.</>}
            </p>

            {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}
            {saved && (
                <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Metinler kaydedildi.
                </div>
            )}

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {SECTIONS.map(({ key, label, hint }) => (
                        <div key={key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <label htmlFor={key} className="block text-sm font-semibold text-gray-900">
                                {label}
                            </label>
                            <p className="mt-1 text-xs text-gray-500">{hint}</p>
                            <textarea
                                id={key}
                                rows={key === 'contactInfo' ? 6 : 14}
                                value={form[key]}
                                onChange={handleChange(key)}
                                disabled={saving}
                                className="mt-3 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder={`${label} metnini buraya yazın`}
                            />
                            <div className="mt-1 text-right text-xs text-gray-400">
                                {form[key].length.toLocaleString('tr-TR')} / 50.000 karakter
                            </div>
                        </div>
                    ))}

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                        <Save size={16} />
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </form>
            )}
        </div>
    );
}
