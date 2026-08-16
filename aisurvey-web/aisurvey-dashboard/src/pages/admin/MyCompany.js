import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Check, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const EMPTY_FORM = {
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: ''
};

// Backend hatalarını (ValidationErrorResponse veya ErrorResponse) tek metne indirger.
const readApiError = (err, fallback) => {
    const data = err.response?.data;
    if (data?.errors && typeof data.errors === 'object') {
        return Object.values(data.errors)
            .map(value => (Array.isArray(value) ? value.join(' ') : value))
            .join(' ');
    }
    return data?.message || fallback;
};

/**
 * "Şirketim": şirket sahibinin kendi şirket bilgilerini düzenlediği ekran.
 * Hem kendi sayfası olarak (/admin/my-company) hem Ayarlar > Şirketim
 * sekmesinde gömülü kullanılır; embedded=true sayfa başlığını gizler.
 *
 * Şirket türü burada değiştirilemez: hazır anket kalıpları ve masa bazlı QR
 * gibi özellikler türe bağlı, sonradan değişmesi mevcut anketleri bozar.
 */
export default function MyCompany({ embedded = false }) {
    const { user, userProfile } = useAuth();
    const companyId = user?.companyId || userProfile?.companyId;

    const [company, setCompany] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [companyTypes, setCompanyTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const authHeader = () => {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    };

    useEffect(() => {
        // Şirket kullanıcısında bu uç zaten yalnızca kendi şirketini döner.
        axios
            .get(`${API_BASE_URL}/company`, { headers: authHeader() })
            .then(res => {
                const list = Array.isArray(res.data) ? res.data : [];
                const own = list.find(c => c.id === companyId) || list[0];

                if (!own) {
                    setError('Şirket bilgisi bulunamadı.');
                    return;
                }

                setCompany(own);
                setForm({
                    name: own.name || '',
                    description: own.description || '',
                    address: own.address || '',
                    phone: own.phone || '',
                    email: own.email || '',
                    website: own.website || '',
                    logoUrl: own.logoUrl || ''
                });
            })
            .catch(err => setError(readApiError(err, 'Şirket bilgileri yüklenemedi.')))
            .finally(() => setLoading(false));

        axios
            .get(`${API_BASE_URL}/company/types`)
            .then(res => setCompanyTypes(Array.isArray(res.data) ? res.data : []))
            .catch(() => setCompanyTypes([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    const typeLabel = () => {
        if (!company?.companyType) {
            return 'Belirtilmemiş';
        }
        const match = companyTypes.find(type => type.value === company.companyType);
        const label = match ? match.label : company.companyType;
        return company.companyTypeOther ? `${label} (${company.companyTypeOther})` : label;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setSaving(true);

        try {
            // Gövde şirketin tamamıdır: backend gönderilmeyen alanları boşaltıyor.
            const response = await axios.put(`${API_BASE_URL}/company/${company.id}`,
                { ...company, ...form },
                { headers: authHeader() });

            setCompany(response.data);
            setSuccess('Şirket bilgileriniz güncellendi.');
        } catch (err) {
            setError(readApiError(err, 'Şirket bilgileri güncellenemedi.'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p className="text-muted">Şirket bilgileri yükleniyor...</p>;
    }

    return (
        <div className={embedded ? '' : 'settings-page'}>
            {!embedded && (
                <div className="page-header">
                    <div className="header-content">
                        <h1 className="page-title">Şirketim</h1>
                    </div>
                </div>
            )}

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

            {company && (
                <div className={embedded ? '' : 'card'}>
                    {!embedded && (
                        <div className="card-header">
                            <h2><Building2 size={18} /> Şirket Bilgileri</h2>
                        </div>
                    )}
                    <div className={embedded ? '' : 'card-body'}>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="companyName">Şirket Adı *</label>
                                    <input id="companyName" name="name" className="form-control"
                                           value={form.name} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="companyType">Şirket Türü</label>
                                    <input id="companyType" className="form-control" value={typeLabel()} disabled />
                                    <small className="text-muted">
                                        Şirket türü hazır anket kalıplarını belirler; değiştirmek için
                                        site yönetimine mesaj gönderin.
                                    </small>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="companyDescription">Açıklama</label>
                                <textarea id="companyDescription" name="description" className="form-control"
                                          rows={3} value={form.description} onChange={handleChange} />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="companyPhone">Telefon</label>
                                    <input id="companyPhone" name="phone" type="tel" className="form-control"
                                           placeholder="+905551234567"
                                           value={form.phone} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="companyEmail">E-posta</label>
                                    <input id="companyEmail" name="email" type="email" className="form-control"
                                           value={form.email} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="companyAddress">Adres</label>
                                <textarea id="companyAddress" name="address" className="form-control"
                                          rows={2} value={form.address} onChange={handleChange} />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="companyWebsite">Web Sitesi</label>
                                    <input id="companyWebsite" name="website" className="form-control"
                                           placeholder="https://ornek.com"
                                           value={form.website} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="companyLogoUrl">Logo Adresi</label>
                                    <input id="companyLogoUrl" name="logoUrl" className="form-control"
                                           placeholder="https://ornek.com/logo.png"
                                           value={form.logoUrl} onChange={handleChange} />
                                </div>
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
        </div>
    );
}
