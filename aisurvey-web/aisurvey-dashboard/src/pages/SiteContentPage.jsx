import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL;

/**
 * Süper adminin "Site Yönetimi" ekranında yazdığı metinler. Üç sayfanın da
 * içeriği aynı uçtan gelir; ayrı ayrı bileşen yazmak yerine bölüm anahtarı
 * parametre olarak verilir.
 */
const TITLES = {
    privacyPolicy: 'Gizlilik Sözleşmesi',
    termsOfService: 'Kullanım Şartları',
    contactInfo: 'İletişim'
};

const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString('tr-TR', { dateStyle: 'long' }) : null;

export default function SiteContentPage({ section }) {
    const navigate = useNavigate();
    const [content, setContent] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // "Ana sayfa" bağlantısı "/" idi, o da girişe yönleniyordu: sözleşmeyi
    // panelden açan kullanıcı geri dönmek isteyince çıkış yapmış gibi oluyordu.
    // Geçmişte önceki bir kayıt varsa oraya dönülür (react-router idx'i tutar).
    const canGoBack = (window.history.state?.idx ?? 0) > 0;

    useEffect(() => {
        let active = true;
        setLoading(true);

        // Uç herkese açıktır; ziyaretçinin oturumu olmayabilir.
        axios.get(`${API_BASE_URL}/api/public/site-content`)
            .then(res => {
                if (!active) return;
                setContent(res.data?.[section] || '');
                setUpdatedAt(res.data?.updatedAt || null);
                setError(false);
            })
            .catch(() => { if (active) setError(true); })
            .finally(() => { if (active) setLoading(false); });

        return () => { active = false; };
    }, [section]);

    return (
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
                {canGoBack && (
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        title="Önceki sayfaya dön"
                    >
                        <ChevronLeft size={16} />
                        <span>Geri</span>
                    </button>
                )}
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{TITLES[section]}</h1>
                    {updatedAt && (
                        <p className="text-sm text-gray-500">Son güncelleme: {formatDate(updatedAt)}</p>
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                {loading && (
                    <div className="flex h-24 items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                    </div>
                )}

                {!loading && error && (
                    <p className="text-sm text-red-700">
                        Metin şu anda görüntülenemiyor. Lütfen daha sonra tekrar deneyin.
                    </p>
                )}

                {/* Metin düz yazıdır: satır sonları korunur, HTML olarak çalıştırılmaz. */}
                {!loading && !error && (
                    content
                        ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{content}</p>
                        : <p className="text-sm text-gray-500">Bu bölüm henüz doldurulmadı.</p>
                )}
            </div>
        </div>
    );
}
