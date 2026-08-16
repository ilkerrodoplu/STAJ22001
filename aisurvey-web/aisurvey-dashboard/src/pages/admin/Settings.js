import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, Building2, Check, CreditCard, KeyRound, Trash2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isCompanyOwner, isSiteAdmin } from '../../utils/roles';
import PlansPage from './PlansPage';
import MyCompany from './MyCompany';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const TABS = [
    { id: 'personal', label: 'Kişisel Bilgiler', icon: UserIcon },
    { id: 'company', label: 'Şirketim', icon: Building2 },
    { id: 'password', label: 'Şifre', icon: KeyRound },
    { id: 'subscription', label: 'Abonelik (WIP)', icon: CreditCard },
    { id: 'account', label: 'Hesap', icon: Trash2 }
];

// Süper admin hesabı panelden kapatılamaz; abonelik de şirkete aittir.
const SUPER_ADMIN_HIDDEN_TABS = new Set(['account', 'subscription', 'company']);

// Şirket bilgilerini yalnızca sahibi düzenleyebilir (backend de öyle kısıtlar).
const OWNER_ONLY_TABS = new Set(['company']);

const EMPTY_PASSWORD_FORM = { currentPassword: '', newPassword: '', newPasswordConfirm: '' };

// Backend hatalarını (ValidationErrorResponse veya ErrorResponse) tek bir metne indirger.
const readApiError = (err, fallback) => {
    const data = err.response?.data;
    if (data?.errors && typeof data.errors === 'object') {
        return Object.values(data.errors)
            .map(value => (Array.isArray(value) ? value.join(' ') : value))
            .join(' ');
    }
    return data?.message || fallback;
};

export default function Settings() {
    const { user, userProfile, fetchUserProfile, logout } = useAuth();
    const roles = userProfile?.roles || user?.roles;
    const superAdmin = isSiteAdmin(roles);
    const owner = isCompanyOwner(roles);
    const visibleTabs = TABS.filter(tab => {
        if (superAdmin) {
            return !SUPER_ADMIN_HIDDEN_TABS.has(tab.id);
        }
        return !OWNER_ONLY_TABS.has(tab.id) || owner;
    });
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('personal');
    const [closeForm, setCloseForm] = useState({ password: '', confirmed: false });
    const [profileForm, setProfileForm] = useState({
        name: '', lastName: '', email: '', phone: '', address: ''
    });
    const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const authHeader = () => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    };

    useEffect(() => {
        axios
            .get(`${API_BASE_URL}/users/profile`, { headers: authHeader() })
            .then(res => fillProfileForm(res.data))
            .catch(() => fillProfileForm(userProfile || {}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fillProfileForm = (data) => {
        setProfileForm({
            name: data.name || '',
            lastName: data.lastName || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || ''
        });
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setSaving(true);

        try {
            const response = await axios.put(`${API_BASE_URL}/users/profile`, profileForm, {
                headers: authHeader()
            });

            // E-posta JWT'nin subject'i olduğu için backend yeni token döndürür;
            // saklamazsak sonraki istekler 401 alır.
            if (response.data?.token) {
                localStorage.setItem('authToken', response.data.token);
                localStorage.setItem('token', response.data.token);
            }
            if (response.data?.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }

            await fetchUserProfile();
            setSuccess('Kişisel bilgileriniz güncellendi.');
        } catch (err) {
            setError(readApiError(err, 'Bilgiler güncellenemedi.'));
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
            setError('Şifreler eşleşmiyor.');
            return;
        }

        setSaving(true);
        try {
            await axios.put(`${API_BASE_URL}/users/profile/password`, passwordForm, {
                headers: authHeader()
            });
            setPasswordForm(EMPTY_PASSWORD_FORM);
            setSuccess('Şifreniz güncellendi.');
        } catch (err) {
            setError(readApiError(err, 'Şifre güncellenemedi.'));
        } finally {
            setSaving(false);
        }
    };

    // Hesap kapatma: backend aktif anket varsa 409 döner, yoksa hesabı pasife alır.
    const handleCloseAccount = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setSaving(true);

        try {
            await axios.post(`${API_BASE_URL}/users/close-account`,
                { password: closeForm.password },
                { headers: authHeader() });

            logout();
            navigate('/admin/login');
        } catch (err) {
            setError(readApiError(err, 'Hesap kapatılamadı.'));
        } finally {
            setSaving(false);
        }
    };

    const switchTab = (tabId) => {
        setActiveTab(tabId);
        setError(null);
        setSuccess(null);
        setCloseForm({ password: '', confirmed: false });
    };

    return (
        <div className="settings-page">
            <div className="page-header">
                <div className="header-content">
                    <h1 className="page-title">Ayarlar</h1>
                </div>
            </div>

            <div className="settings-tabs">
                {visibleTabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        className={`settings-tab ${activeTab === id ? 'active' : ''}`}
                        onClick={() => switchTab(id)}
                    >
                        <Icon size={16} />
                        <span>{label}</span>
                    </button>
                ))}
            </div>

            {error && (
                <div className="error-message">
                    <AlertTriangle size={20} />
                    <p>{error}</p>
                </div>
            )}
            {success && (
                <div className="success-message">
                    <Check size={20} />
                    <p>{success}</p>
                </div>
            )}

            {activeTab === 'personal' && (
                <div className="card">
                    <div className="card-header">
                        <h2>Kişisel Bilgiler</h2>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleProfileSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="name">Ad *</label>
                                    <input id="name" name="name" className="form-control"
                                           value={profileForm.name} onChange={handleProfileChange} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="lastName">Soyad</label>
                                    <input id="lastName" name="lastName" className="form-control"
                                           value={profileForm.lastName} onChange={handleProfileChange} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">E-posta *</label>
                                <input id="email" name="email" type="email" className="form-control"
                                       value={profileForm.email} onChange={handleProfileChange} required />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">Telefon *</label>
                                <input id="phone" name="phone" type="tel" className="form-control"
                                       placeholder="+905551234567"
                                       value={profileForm.phone} onChange={handleProfileChange} required />
                            </div>

                            <div className="form-group">
                                <label htmlFor="address">Adres</label>
                                <textarea id="address" name="address" className="form-control" rows={2}
                                          value={profileForm.address} onChange={handleProfileChange} />
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'company' && owner && (
                <div className="card">
                    <div className="card-header">
                        <h2>Şirketim</h2>
                    </div>
                    <div className="card-body">
                        <MyCompany embedded />
                    </div>
                </div>
            )}

            {activeTab === 'password' && (
                <div className="card">
                    <div className="card-header">
                        <h2>Şifre Değiştir</h2>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="form-group">
                                <label htmlFor="currentPassword">Mevcut Şifre *</label>
                                <input id="currentPassword" name="currentPassword" type="password"
                                       className="form-control" value={passwordForm.currentPassword}
                                       onChange={handlePasswordChange} required />
                            </div>

                            <div className="form-group">
                                <label htmlFor="newPassword">Yeni Şifre *</label>
                                <input id="newPassword" name="newPassword" type="password"
                                       className="form-control" value={passwordForm.newPassword}
                                       onChange={handlePasswordChange} required />
                                <small className="text-muted">
                                    En az 8 karakter, bir küçük harf, bir büyük harf ve bir rakam içermelidir.
                                </small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="newPasswordConfirm">Yeni Şifre (Tekrar) *</label>
                                <input id="newPasswordConfirm" name="newPasswordConfirm" type="password"
                                       className="form-control" value={passwordForm.newPasswordConfirm}
                                       onChange={handlePasswordChange} required />
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'subscription' && (
                <div className="card">
                    <div className="card-header">
                        <h2>Abonelik <span className="wip-badge">WIP</span></h2>
                    </div>
                    <div className="card-body">
                        <p className="text-muted">
                            Abonelik yönetimi henüz geliştirme aşamasında. Üyelik planları geçici
                            olarak burada listeleniyor.
                        </p>
                        {/* PlansPage tam sayfa olarak yazılmıştı; sekme içinde
                            gömülü görünmesi için sayfa chrome'u CSS ile kısılır. */}
                        <div className="embedded-plans">
                            <PlansPage />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'account' && !superAdmin && (
                <div className="card">
                    <div className="card-header">
                        <h2>Hesabı Kapat</h2>
                    </div>
                    <div className="card-body">
                        <p className="text-muted">
                            Hesabınız hemen silinmez, önce pasife alınır. 1 yıl içinde e-posta ve
                            şifrenizle giriş yaparak geri alabilirsiniz; geri almazsanız hesabınız
                            kalıcı olarak silinir. Aktif anketiniz varsa hesabınızı kapatamazsınız.
                        </p>

                        <form onSubmit={handleCloseAccount}>
                            <div className="form-group">
                                <label htmlFor="closePassword">Şifreniz *</label>
                                <input id="closePassword" type="password" className="form-control"
                                       value={closeForm.password}
                                       onChange={(e) => setCloseForm(prev => ({ ...prev, password: e.target.value }))}
                                       required />
                            </div>

                            <div className="form-group form-check">
                                <input id="closeConfirm" type="checkbox" className="form-check-input"
                                       checked={closeForm.confirmed}
                                       onChange={(e) => setCloseForm(prev => ({ ...prev, confirmed: e.target.checked }))} />
                                <label htmlFor="closeConfirm" className="form-check-label">
                                    Hesabımı kapatmak istediğimi onaylıyorum.
                                </label>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-danger"
                                        disabled={saving || !closeForm.password || !closeForm.confirmed}>
                                    {saving ? 'Kapatılıyor...' : 'Hesabı Kapat'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
