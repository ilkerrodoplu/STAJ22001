import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Building2, LogOut, KeyRound, PlusCircle, UserX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

// Kayıt kodu şirket sahibinin panelinden alınır: 8 karakter, karışan harfler yok.
const INVITE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{8}$/;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

const TABS = [
    { id: 'join', label: 'Şirkete Katıl', icon: KeyRound },
    { id: 'found', label: 'Şirket Kur', icon: PlusCircle },
    { id: 'close', label: 'Hesabı Kapat', icon: UserX }
];

const EMPTY_COMPANY = {
    name: '', companyType: '', companyTypeOther: '',
    email: '', phone: '', website: '', address: ''
};

/**
 * Şirketi olmayan kullanıcının ekranı: şirketten çıkarılan ya da katılma isteği
 * reddedilen çalışan buraya düşer. Hesabı duruyor, üç yolu var: başka şirkete
 * kayıt koduyla katılmak, kendi şirketini kurmak ya da hesabını kapatmak.
 */
export default function JoinCompany() {
    const navigate = useNavigate();
    const { logout, fetchUserProfile } = useAuth();
    const [tab, setTab] = useState('join');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [inviteCode, setInviteCode] = useState('');
    const [company, setCompany] = useState(EMPTY_COMPANY);
    const [companyTypes, setCompanyTypes] = useState([]);
    const [closeForm, setCloseForm] = useState({ password: '', confirmed: false });

    // Şirket türü listesinin tek kaynağı backend; kayıt ekranıyla aynı uç.
    useEffect(() => {
        axios.get(`${API_BASE_URL}/company/types`)
            .then(res => setCompanyTypes(res.data || []))
            .catch(() => setCompanyTypes([]));
    }, []);

    const switchTab = (id) => {
        setTab(id);
        setError(null);
    };

    const apiError = (err, fallback) => {
        const data = err.response?.data;
        if (data?.errors && typeof data.errors === 'object') {
            return Object.values(data.errors).flat().join(' ');
        }
        return data?.message || fallback;
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        const code = inviteCode.trim().toUpperCase();
        if (!INVITE_CODE_REGEX.test(code)) {
            setError('Kayıt kodu 8 karakterdir, şirket sahibinden alabilirsiniz.');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            await axios.post(`${API_BASE_URL}/company/staff/join`, { inviteCode: code },
                { headers: authHeader() });

            // Profil yenilenmeden panel eski şirketsiz hâli görüyor.
            await fetchUserProfile();
            toast.success('Katılma isteğiniz iletildi, şirket sahibinin onayı bekleniyor.');
            navigate('/admin/profile', { replace: true });
        } catch (err) {
            setError(apiError(err, 'Şirkete katılınamadı. Kodu şirket sahibinizle doğrulayın.'));
        } finally {
            setLoading(false);
        }
    };

    const handleFound = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            await axios.post(`${API_BASE_URL}/company/found`, {
                ...company,
                companyTypeOther: company.companyType === 'OTHER' ? company.companyTypeOther : null
            }, { headers: authHeader() });

            await fetchUserProfile();
            toast.success('Şirketiniz kuruldu, artık şirket sahibisiniz.');
            navigate('/admin/dashboard', { replace: true });
        } catch (err) {
            setError(apiError(err, 'Şirket kurulamadı. Bilgileri kontrol edin.'));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);
            await axios.post(`${API_BASE_URL}/users/close-account`,
                { password: closeForm.password }, { headers: authHeader() });

            logout();
            navigate('/admin/login', { replace: true });
        } catch (err) {
            setError(apiError(err, 'Hesap kapatılamadı.'));
        } finally {
            setLoading(false);
        }
    };

    const field = (name, label, type = 'text', required = true) => (
        <div>
            <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
                {label}{required && ' *'}
            </label>
            <input
                id={name}
                type={type}
                value={company[name]}
                onChange={(e) => setCompany(prev => ({ ...prev, [name]: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
        </div>
    );

    return (
        <div className="flex min-h-screen items-start justify-center bg-gray-50 p-4">
            <div className="mt-10 w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col items-center text-center">
                    <Building2 size={36} strokeWidth={1.5} className="text-indigo-600" />
                    <h1 className="mt-3 text-lg font-semibold text-gray-900">Hesabınız bir şirkete bağlı değil</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Başka bir şirkete katılabilir, kendi şirketinizi kurabilir ya da
                        hesabınızı kapatabilirsiniz.
                    </p>
                </div>

                <div className="mt-5 flex rounded-md border border-gray-200 p-1">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => switchTab(id)}
                            className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm ${
                                tab === id ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Icon size={16} /> {label}
                        </button>
                    ))}
                </div>

                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                {tab === 'join' && (
                    <form onSubmit={handleJoin} className="mt-5 space-y-4">
                        <div>
                            <label htmlFor="inviteCode" className="mb-1 block text-sm font-medium text-gray-700">
                                Şirket Kayıt Kodu
                            </label>
                            <input
                                id="inviteCode"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                maxLength={8}
                                placeholder="ÖRN: K7M2QX9P"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Kod güvenlik için kısa sürede değişir; aldığınız anda girin.
                                Katılımınız şirket sahibinin onayına düşer.
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-60"
                        >
                            {loading ? 'Gönderiliyor...' : 'Şirkete Katıl'}
                        </button>
                    </form>
                )}

                {tab === 'found' && (
                    <form onSubmit={handleFound} className="mt-5 space-y-4">
                        <p className="text-sm text-gray-600">
                            Kendi şirketinizi kurarsanız onay beklemezsiniz; şirketin sahibi olur,
                            çalışanlarınızı kayıt koduyla davet edebilirsiniz.
                        </p>
                        {field('name', 'Şirket Adı')}
                        <div>
                            <label htmlFor="companyType" className="mb-1 block text-sm font-medium text-gray-700">
                                Şirket Türü *
                            </label>
                            <select
                                id="companyType"
                                value={company.companyType}
                                onChange={(e) => setCompany(prev => ({ ...prev, companyType: e.target.value }))}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Seçiniz</option>
                                {companyTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        {company.companyType === 'OTHER' && field('companyTypeOther', 'Şirket Türünü Yazın')}
                        {field('email', 'Şirket E-postası', 'email')}
                        {field('phone', 'Şirket Telefonu (örn. +905551112233)')}
                        {field('website', 'Web Sitesi')}
                        {field('address', 'Adres', 'text', false)}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-60"
                        >
                            {loading ? 'Kuruluyor...' : 'Şirketi Kur'}
                        </button>
                    </form>
                )}

                {tab === 'close' && (
                    <form onSubmit={handleClose} className="mt-5 space-y-4">
                        <p className="text-sm text-gray-600">
                            Hesabınız silinmez, pasife alınır. 1 yıl içinde giriş bilgilerinizle geri
                            alabilirsiniz; almazsanız kalıcı olarak silinir.
                        </p>
                        <div>
                            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                                Şifreniz
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={closeForm.password}
                                onChange={(e) => setCloseForm(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <label className="flex items-start gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={closeForm.confirmed}
                                onChange={(e) => setCloseForm(prev => ({ ...prev, confirmed: e.target.checked }))}
                                className="mt-1"
                            />
                            Hesabımı kapatmak istediğimi onaylıyorum.
                        </label>
                        <button
                            type="submit"
                            disabled={loading || !closeForm.confirmed || !closeForm.password}
                            className="w-full rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                        >
                            {loading ? 'Kapatılıyor...' : 'Hesabımı Kapat'}
                        </button>
                    </form>
                )}

                <button
                    onClick={() => navigate(logout())}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <LogOut size={16} /> Çıkış Yap
                </button>
            </div>
        </div>
    );
}
