
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Edit,
    ArrowLeft,
    QrCode,
    BarChart2,
    Star,
    Phone,
    Mail,
    Globe,
    MapPin,
    Calendar,
    MessageSquare,
    Download,
    User,
    Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

export default function CompanyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [company, setCompany] = useState(null);
    const [stats, setStats] = useState({
        totalResponses: 0,
        avgRating: 0,
        responsesByMonth: []
    });
    const [surveyTemplates, setSurveyTemplates] = useState([]);
    const [qrCodes, setQrCodes] = useState([]);
    const [recentResponses, setRecentResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchCompanyData = async () => {
            try {
                setLoading(true);

                const token = localStorage.getItem('authToken');

                // Firma bilgilerini al
                const companyResponse = await axios.get(`${API_BASE_URL}/company/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // İstatistikleri al
                const statsResponse = await axios.get(`${API_BASE_URL}/company/${id}/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Anket şablonlarını al
                const templatesResponse = await axios.get(`${API_BASE_URL}/company/${id}/survey-templates`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // QR kodları al
                const qrCodesResponse = await axios.get(`${API_BASE_URL}/company/${id}/qr-codes`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Son yanıtları al
                const responsesResponse = await axios.get(`${API_BASE_URL}/company/${id}/responses`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { size: 5 }
                });

                setCompany(companyResponse.data);
                setStats(statsResponse.data);
                setSurveyTemplates(templatesResponse.data);
                setQrCodes(qrCodesResponse.data);
                setRecentResponses(responsesResponse.data.content);

                setLoading(false);
            } catch (err) {
                console.error('Firma detayları yüklenirken hata:', err);
                setError('Firma detayları yüklenemedi. Lütfen tekrar deneyin.');
                setLoading(false);
            }
        };

        if (id) {
            fetchCompanyData();
        }
    }, [id]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleDownloadQR = (qrId, name) => {
        const link = document.createElement('a');
        link.href = `${API_BASE_URL}/qr-codes/${qrId}/download`;
        link.setAttribute('download', `${name.replace(/\s+/g, '-').toLowerCase()}-qr.png`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Yükleniyor durumu
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Firma detayları yükleniyor...</p>
            </div>
        );
    }

    // Hata durumu
    if (error) {
        return (
            <div className="error-container">
                <div className="error-icon">!</div>
                <h2>Bir hata oluştu</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/admin/company')} className="btn btn-primary">
                    Firmalar Listesine Dön
                </button>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Üst Bar */}
            <div className="page-header">
                <div className="header-back-title">
                    <Link to="/admin/company" className="back-button">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="page-title">{company.name}</h1>
                </div>

                <div className="header-actions">
                    <Link to={`/admin/company/${id}/edit`} className="btn btn-outline">
                        <Edit size={16} />
                        <span>Düzenle</span>
                    </Link>
                </div>
            </div>

            {/* Üst Kartlar */}
            <div className="detail-header-container">
                <div className="detail-header-info">
                    <div className="company-logo-container">
                        {company.logoUrl ? (
                            <img
                                src={company.logoUrl}
                                alt={`${company.name} logo`}
                                className="company-logo-large"
                            />
                        ) : (
                            <div className="company-logo-placeholder-large">
                                {company.name.charAt(0)}
                            </div>
                        )}
                    </div>

                    <div className="company-info">
                        <h2 className="company-name">{company.name}</h2>

                        <div className="company-meta">
                            <div className="meta-item">
                                <Star size={16} />
                                <span className="meta-value">{stats.avgRating.toFixed(1)}</span>
                                <span className="meta-label">Ortalama Puan</span>
                            </div>

                            <div className="meta-item">
                                <MessageSquare size={16} />
                                <span className="meta-value">{stats.totalResponses}</span>
                                <span className="meta-label">Toplam Yanıt</span>
                            </div>

                            <div className="meta-item">
                                <Activity size={16} />
                                <span className="meta-value">{surveyTemplates.filter(t => t.status === 'active').length}</span>
                                <span className="meta-label">Aktif Anketler</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="detail-header-status">
          <span className={`status-badge status-badge-large ${company.status === 'active' ? 'status-active' : 'status-inactive'}`}>
            {company.status === 'active' ? 'Aktif' : 'Pasif'}
          </span>
                </div>
            </div>

            {/* Sekme Menüsü */}
            <div className="tabs-container">
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => handleTabChange('overview')}
                    >
                        Genel Bakış
                    </button>
                    <button
                        className={`tab ${activeTab === 'surveys' ? 'active' : ''}`}
                        onClick={() => handleTabChange('surveys')}
                    >
                        Anketler
                    </button>
                    <button
                        className={`tab ${activeTab === 'qrcodes' ? 'active' : ''}`}
                        onClick={() => handleTabChange('qrcodes')}
                    >
                        QR Kodlar
                    </button>
                </div>
            </div>

            {/* Sekme İçerikleri */}
            <div className="tab-content">
                {/* Genel Bakış Sekmesi */}
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        <div className="tab-grid">
                            {/* İletişim Bilgileri */}
                            <div className="card">
                                <div className="card-header">
                                    <h3>İletişim Bilgileri</h3>
                                </div>
                                <div className="card-body">
                                    <div className="contact-info-list">
                                        {company.address && (
                                            <div className="contact-info-item">
                                                <MapPin size={18} />
                                                <span>{company.address}</span>
                                            </div>
                                        )}

                                        {company.phone && (
                                            <div className="contact-info-item">
                                                <Phone size={18} />
                                                <span>{company.phone}</span>
                                            </div>
                                        )}

                                        {company.email && (
                                            <div className="contact-info-item">
                                                <Mail size={18} />
                                                <span>{company.email}</span>
                                            </div>
                                        )}

                                        {company.website && (
                                            <div className="contact-info-item">
                                                <Globe size={18} />
                                                <a href={company.website} target="_blank" rel="noopener noreferrer">{company.website}</a>
                                            </div>
                                        )}

                                        {company.createdAt && (
                                            <div className="contact-info-item">
                                                <Calendar size={18} />
                                                <span>Kayıt Tarihi: {new Date(company.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Aylık Yanıt Grafiği */}
                            <div className="card">
                                <div className="card-header">
                                    <h3>Aylık Yanıt Grafiği</h3>
                                </div>
                                <div className="card-body" style={{ height: '300px' }}>
                                    {stats.responsesByMonth.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart
                                                data={stats.responsesByMonth}
                                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="month" />
                                                <YAxis />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Yanıt Sayısı" />
                                                <Line type="monotone" dataKey="avgRating" stroke="#10b981" name="Ortalama Puan" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="empty-chart-message">
                                            <p>Henüz yeterli veri yok</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Son Yanıtlar */}
                            <div className="card">
                                <div className="card-header">
                                    <h3>Son Yanıtlar</h3>
                                    <Link to={`/admin/company/${id}/responses`} className="card-link">
                                        Tümünü Gör
                                    </Link>
                                </div>
                                <div className="card-body">
                                    {recentResponses.length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="data-table">
                                                <thead>
                                                <tr>
                                                    <th>Müşteri</th>
                                                    <th>Anket</th>
                                                    <th>Puan</th>
                                                    <th>Tarih</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {recentResponses.map(response => (
                                                    <tr key={response.id}>
                                                        <td>
                                                            <div className="user-info">
                                                                <div className="user-avatar">
                                                                    <User size={16} />
                                                                </div>
                                                                <div className="user-name">
                                                                    Müşteri
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{response.surveyName}</td>
                                                        <td>
                                                            <div className="rating-display">
                                                                <Star size={16} className="rating-star-icon" />
                                                                <span>{response.avgRating.toFixed(1)}</span>
                                                            </div>
                                                        </td>
                                                        <td>{new Date(response.createdAt).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="empty-table-message">
                                            <p>Henüz yanıt yok</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Anketler Sekmesi */}
                {activeTab === 'surveys' && (
                    <div className="surveys-tab">
                        <div className="tab-header">
                            <h2>Anketler</h2>
                            <Link to={`/admin/survey-templates/new?companyId=${id}`} className="btn btn-primary">
                                <BarChart2 size={16} />
                                <span>Yeni Anket Oluştur</span>
                            </Link>
                        </div>

                        <div className="card">
                            <div className="card-body">
                                {surveyTemplates.length > 0 ? (
                                    <div className="survey-templates-grid">
                                        {surveyTemplates.map(template => (
                                            <div key={template.id} className="survey-template-card">
                                                <div className="template-header">
                                                    <h3 className="template-title">{template.name}</h3>
                                                    <span className={`status-badge ${template.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                            {template.status === 'active' ? 'Aktif' : 'Pasif'}
                          </span>
                                                </div>

                                                <div className="template-stats">
                                                    <div className="template-stat">
                                                        <span className="stat-value">{template.questionCount}</span>
                                                        <span className="stat-label">Soru</span>
                                                    </div>
                                                    <div className="template-stat">
                                                        <span className="stat-value">{template.responseCount}</span>
                                                        <span className="stat-label">Yanıt</span>
                                                    </div>
                                                    <div className="template-stat">
                            <span className="stat-value">
                              <Star size={14} className="rating-star-icon" />
                                {template.avgRating ? template.avgRating.toFixed(1) : 'N/A'}
                            </span>
                                                        <span className="stat-label">Puan</span>
                                                    </div>
                                                </div>

                                                <div className="template-dates">
                                                    <div className="template-date">
                                                        <span className="date-label">Oluşturulma:</span>
                                                        <span className="date-value">{new Date(template.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="template-date">
                                                        <span className="date-label">Son Güncelleme:</span>
                                                        <span className="date-value">{new Date(template.updatedAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="template-actions">
                                                    <Link to={`/admin/survey-templates/${template.id}`} className="btn btn-sm btn-outline">
                                                        Detayları Gör
                                                    </Link>
                                                    <Link to={`/admin/survey-templates/${template.id}/edit`} className="btn btn-sm btn-outline">
                                                        <Edit size={14} />
                                                        <span>Düzenle</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-list-message">
                                        <BarChart2 size={48} strokeWidth={1} />
                                        <h3>Henüz anket yok</h3>
                                        <p>Bu Firma için yeni bir anket oluşturun.</p>
                                        <Link to={`/admin/survey-templates/new?companyId=${id}`} className="btn btn-primary">
                                            Anket Oluştur
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* QR Kodlar Sekmesi */}
                {activeTab === 'qrcodes' && (
                    <div className="qrcodes-tab">
                        <div className="tab-header">
                            <h2>QR Kodlar</h2>
                            <Link to={`/admin/qr-codes/new?companyId=${id}`} className="btn btn-primary">
                                <QrCode size={16} />
                                <span>Yeni QR Kod Oluştur</span>
                            </Link>
                        </div>

                        <div className="card">
                            <div className="card-body">
                                {qrCodes.length > 0 ? (
                                    <div className="qr-codes-grid">
                                        {qrCodes.map(qrCode => (
                                            <div key={qrCode.id} className="qr-code-card">
                                                <div className="qr-image-container">
                                                    <img
                                                        src={qrCode.imageUrl}
                                                        alt={`QR Code for ${qrCode.name}`}
                                                        className="qr-image"
                                                    />
                                                </div>

                                                <div className="qr-details">
                                                    <h3 className="qr-name">{qrCode.name}</h3>
                                                    <div className="qr-meta">
                                                        <div className="qr-template">
                                                            <span className="qr-label">Anket:</span>
                                                            <span className="qr-value">{qrCode.surveyTemplateName}</span>
                                                        </div>
                                                        <div className="qr-created">
                                                            <span className="qr-label">Oluşturulma:</span>
                                                            <span className="qr-value">{new Date(qrCode.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="qr-status">
                                                            <span className="qr-label">Durum:</span>
                                                            <span className={`status-badge ${qrCode.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                                {qrCode.status === 'active' ? 'Aktif' : 'Pasif'}
                              </span>
                                                        </div>
                                                        <div className="qr-scans">
                                                            <span className="qr-label">Tarama Sayısı:</span>
                                                            <span className="qr-value">{qrCode.scanCount}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="qr-actions">
                                                    <button
                                                        className="btn btn-sm btn-outline"
                                                        onClick={() => handleDownloadQR(qrCode.id, qrCode.name)}
                                                    >
                                                        <Download size={14} />
                                                        <span>İndir</span>
                                                    </button>
                                                    <Link to={`/admin/qr-codes/${qrCode.id}/edit`} className="btn btn-sm btn-outline">
                                                        <Edit size={14} />
                                                        <span>Düzenle</span>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-list-message">
                                        <QrCode size={48} strokeWidth={1} />
                                        <h3>Henüz QR kod yok</h3>
                                        <p>Bu Firma için yeni bir QR kod oluşturun.</p>
                                        <Link to={`/admin/qr-codes/new?companyId=${id}`} className="btn btn-primary">
                                            QR Kod Oluştur
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
