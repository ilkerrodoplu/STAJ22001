
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Filter, ChevronDown, FileText } from 'lucide-react';

// Alt bileşenler
import ResponseTrendsChart from './charts/ResponseTrendsChart';
import RatingDistributionChart from './charts/RatingDistributionChart';
import TopQuestionsTable from './tables/TopQuestionsTable';
import QuestionTrendsChart from './charts/QuestionTrendsChart';
import TopCompanyTable from './tables/TopCompanyTable';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

export default function ReportDashboard() {
    const [timeRange, setTimeRange] = useState('last30days');
    const [selectedCompany, setSelectedCompany] = useState('all');
    const [company, setCompany] = useState([]);
    const [responsesByDate, setResponsesByDate] = useState([]);
    const [ratingDistribution, setRatingDistribution] = useState([]);
    const [topQuestions, setTopQuestions] = useState([]);
    const [questionTrends, setQuestionTrends] = useState([]);
    const [topCompanys, setTopCompanys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exportLoading, setExportLoading] = useState(false);
    const [filtersVisible, setFiltersVisible] = useState(false);

    useEffect(() => {
        fetchCompany();
    }, []);

    useEffect(() => {
        if (company.length > 0) {
            fetchReportData();
        }
    }, [timeRange, selectedCompany, company]);

    const fetchCompany = async () => {
        try {
            const token = localStorage.getItem('authToken');

            const response = await axios.get(`${API_BASE_URL}/company`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    size: 1000,
                    status: 'active'
                }
            });

            setCompany(response.data);
        } catch (err) {
            console.error('Firmalar yüklenirken hata:', err);
            setError('Firmalar yüklenemedi.');
        }
    };

    const fetchReportData = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('authToken');

            // Zaman aralığını hesapla
            const { startDate, endDate } = calculateDateRange(timeRange);

            // Firma ID'sini belirle
            const companyId = selectedCompany === 'all' ? null : selectedCompany;

            // Paralel olarak birden fazla veri çek
            const [
                responsesByDateRes,
                ratingDistributionRes,
                topQuestionsRes,
                questionTrendsRes,
                topCompanysRes
            ] = await Promise.all([
                // Tarih bazlı yanıtlar
                axios.get(`${API_BASE_URL}/reports/responses-by-date`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { startDate, endDate, companyId }
                }),

                // Derecelendirme dağılımı
                axios.get(`${API_BASE_URL}/reports/rating-distribution`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { startDate, endDate, companyId }
                }),

                // En iyi/kötü sorular
                axios.get(`${API_BASE_URL}/reports/top-questions`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { startDate, endDate, companyId }
                }),

                // Soru trendleri
                axios.get(`${API_BASE_URL}/reports/question-trends`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { startDate, endDate, companyId }
                }),

                // Firmalar performansı (sadece tüm Firmalar seçildiğinde)
                companyId ?
                    Promise.resolve({ data: [] }) :
                    axios.get(`${API_BASE_URL}/reports/top-company`, {
                        headers: { Authorization: `Bearer ${token}` },
                        params: { startDate, endDate }
                    })
            ]);

            setResponsesByDate(responsesByDateRes.data);
            setRatingDistribution(ratingDistributionRes.data);
            setTopQuestions(topQuestionsRes.data);
            setQuestionTrends(questionTrendsRes.data);
            setTopCompanys(topCompanysRes.data);

            setLoading(false);
        } catch (err) {
            console.error('Rapor verileri yüklenirken hata:', err);
            setError('Rapor verileri yüklenemedi. Lütfen tekrar deneyin.');
            setLoading(false);
        }
    };

    const calculateDateRange = (range) => {
        const today = new Date();
        let startDate = new Date();

        switch (range) {
            case 'last7days':
                startDate.setDate(today.getDate() - 7);
                break;
            case 'last30days':
                startDate.setDate(today.getDate() - 30);
                break;
            case 'last90days':
                startDate.setDate(today.getDate() - 90);
                break;
            case 'thisYear':
                startDate = new Date(today.getFullYear(), 0, 1);
                break;
            case 'lastYear':
                startDate = new Date(today.getFullYear() - 1, 0, 1);
                const endOfLastYear = new Date(today.getFullYear(), 0, 0);
                return {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endOfLastYear.toISOString().split('T')[0]
                };
            default:
                startDate.setDate(today.getDate() - 30);
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
        };
    };

    const handleTimeRangeChange = (e) => {
        setTimeRange(e.target.value);
    };

    const handleCompanyChange = (e) => {
        setSelectedCompany(e.target.value);
    };

    const handleExportReport = async () => {
        try {
            setExportLoading(true);

            const token = localStorage.getItem('authToken');

            // Zaman aralığını hesapla
            const { startDate, endDate } = calculateDateRange(timeRange);

            // Firma ID'sini belirle
            const companyId = selectedCompany === 'all' ? null : selectedCompany;

            // PDF'yi indirmek için bir istek yap
            const response = await axios.get(`${API_BASE_URL}/reports/export-pdf`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/pdf',
                },
                params: {
                    startDate,
                    endDate,
                    companyId
                },
                responseType: 'blob'
            });

            // Blob'u indir
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Dosya adını oluştur
            const companyName = selectedCompany === 'all' ?
                'tum-Firmalar' :
                company.find(r => r.id === selectedCompany)?.name.toLowerCase().replace(/\s+/g, '-');

            link.setAttribute('download', `anket-raporu-${companyName}-${startDate}-${endDate}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setExportLoading(false);
        } catch (err) {
            console.error('Rapor dışa aktarılırken hata:', err);
            setError('Rapor dışa aktarılamadı. Lütfen tekrar deneyin.');
            setExportLoading(false);
        }
    };

    const handleExportExcel = async () => {
        try {
            setExportLoading(true);

            const token = localStorage.getItem('authToken');

            // Zaman aralığını hesapla
            const { startDate, endDate } = calculateDateRange(timeRange);

            // Firma ID'sini belirle
            const companyId = selectedCompany === 'all' ? null : selectedCompany;

            // Excel'i indirmek için bir istek yap
            const response = await axios.get(`${API_BASE_URL}/reports/export-excel`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
                params: {
                    startDate,
                    endDate,
                    companyId
                },
                responseType: 'blob'
            });

            // Blob'u indir
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Dosya adını oluştur
            const companyName = selectedCompany === 'all' ?
                'tum-Firmalar' :
                company.find(r => r.id === selectedCompany)?.name.toLowerCase().replace(/\s+/g, '-');

            link.setAttribute('download', `anket-raporu-${companyName}-${startDate}-${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setExportLoading(false);
        } catch (err) {
            console.error('Excel dışa aktarılırken hata:', err);
            setError('Excel dışa aktarılamadı. Lütfen tekrar deneyin.');
            setExportLoading(false);
        }
    };

    // Yükleniyor durumu
    if (loading && company.length === 0) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Rapor verileri yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="report-dashboard-container">
            <div className="page-header">
                <h1 className="page-title">Raporlar</h1>

                <div className="header-actions">
                    <div className="dropdown">
                        <button className="btn btn-outline dropdown-toggle">
                            <Download size={16} />
                            <span>Dışa Aktar</span>
                            <ChevronDown size={16} />
                        </button>
                        <div className="dropdown-menu">
                            <button
                                className="dropdown-item"
                                onClick={handleExportReport}
                                disabled={exportLoading}
                            >
                                <FileText size={16} />
                                <span>PDF Olarak İndir</span>
                            </button>
                            <button
                                className="dropdown-item"
                                onClick={handleExportExcel}
                                disabled={exportLoading}
                            >
                                <FileText size={16} />
                                <span>Excel Olarak İndir</span>
                            </button>
                        </div>
                    </div>

                    <button
                        className={`btn btn-outline ${filtersVisible ? 'active' : ''}`}
                        onClick={() => setFiltersVisible(!filtersVisible)}
                    >
                        <Filter size={16} />
                        <span>Filtreler</span>
                    </button>
                </div>
            </div>

            {/* Filtreler */}
            {filtersVisible && (
                <div className="report-filters">
                    <div className="filters-grid">
                        <div className="filter-group">
                            <label htmlFor="timeRange">Zaman Aralığı:</label>
                            <select
                                id="timeRange"
                                value={timeRange}
                                onChange={handleTimeRangeChange}
                                className="form-control"
                            >
                                <option value="last7days">Son 7 Gün</option>
                                <option value="last30days">Son 30 Gün</option>
                                <option value="last90days">Son 90 Gün</option>
                                <option value="thisYear">Bu Yıl</option>
                                <option value="lastYear">Geçen Yıl</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="company">Firma:</label>
                            <select
                                id="company"
                                value={selectedCompany}
                                onChange={handleCompanyChange}
                                className="form-control"
                            >
                                <option value="all">Tüm Firmalar</option>
                                {company.map(company => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Hata mesajı */}
            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={fetchReportData} className="btn btn-primary btn-sm">
                        Tekrar Dene
                    </button>
                </div>
            )}

            {/* Grafik ve tablolar */}
            <div className="report-grid">
                {/* Yanıt Sayısı Trendi */}
                <ResponseTrendsChart
                    data={responsesByDate}
                    loading={loading}
                />

                {/* Derecelendirme Dağılımı */}
                <RatingDistributionChart
                    data={ratingDistribution}
                    loading={loading}
                />

                {/* En İyi/Kötü Sorular */}
                <TopQuestionsTable
                    data={topQuestions}
                    loading={loading}
                />

                {/* Soru Trendleri */}
                <QuestionTrendsChart
                    data={questionTrends}
                    loading={loading}
                />

                {/* Firmaların Karşılaştırılması (sadece tüm Firmalar seçildiğinde) */}
                {selectedCompany === 'all' && (
                    <TopCompanyTable
                        data={topCompanys}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
}
