import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Copy, Eye, EyeOff, RefreshCw, Timer } from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

/**
 * Kısa ömürlü kayıt kodu kartı (çalışan ve süper admin kodları aynı davranır).
 * Kod saniyede bir sayılır, süre bitince backend'den yenisi çekilir; kalan süre
 * kodun yanında gösterilir.
 */
export default function InviteCodeCard({ path, title, description, hint }) {
    const [code, setCode] = useState('');
    const [secondsLeft, setSecondsLeft] = useState(null);
    const [visible, setVisible] = useState(false);

    const apply = (data) => {
        setCode(data.inviteCode);
        setSecondsLeft(Math.max(1, data.expiresInSeconds || 1));
    };

    const load = useCallback(() => {
        axios.get(`${API_BASE_URL}${path}`, { headers: authHeader() })
            .then(res => apply(res.data))
            .catch(() => toast.error('Kayıt kodu alınamadı'));
    }, [path]);

    useEffect(() => { load(); }, [load]);

    // Sayaç sıfıra inince kodun süresi dolmuştur; backend yenisini üretir.
    useEffect(() => {
        if (secondsLeft === null) return undefined;
        if (secondsLeft <= 0) {
            load();
            return undefined;
        }
        const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [secondsLeft, load]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success('Kayıt kodu kopyalandı');
        } catch {
            toast.error('Kod kopyalanamadı, elle seçip kopyalayın');
        }
    };

    const regenerate = async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}${path}/regenerate`,
                {}, { headers: authHeader() });
            apply(response.data);
            toast.success('Yeni kod üretildi, eski kod artık geçersiz');
        } catch {
            toast.error('Kod yenilenemedi');
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
            <p className="text-sm text-gray-600 mb-4">{description}</p>

            <div className="flex flex-wrap items-center gap-3">
                <code className="rounded-md bg-gray-100 border border-gray-200 px-4 py-2 text-lg font-mono tracking-[0.3em] text-gray-900">
                    {visible ? (code || '--------') : '••••••••'}
                </code>

                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                        secondsLeft !== null && secondsLeft <= 5
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                    title="Kod bu süre sonunda kendiliğinden değişir"
                >
                    <Timer size={16} />
                    {secondsLeft === null ? '--' : `${secondsLeft} sn`}
                </span>

                <button
                    onClick={() => setVisible(v => !v)}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span>{visible ? 'Gizle' : 'Göster'}</span>
                </button>
                <button
                    onClick={copy}
                    disabled={!code}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    <Copy size={16} />
                    <span>Kopyala</span>
                </button>
                <button
                    onClick={regenerate}
                    className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                    title="Kod başkasının eline geçtiyse hemen yenileyin"
                >
                    <RefreshCw size={16} />
                    <span>Yenile</span>
                </button>
            </div>

            {hint && <p className="mt-3 text-xs text-gray-500">{hint}</p>}
        </div>
    );
}
