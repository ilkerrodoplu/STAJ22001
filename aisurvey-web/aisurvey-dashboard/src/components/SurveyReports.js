import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import AIAnalysisModal from './dashboard/AIAnalysisModal';
import DetailModal from './ui/DetailModal';
import SurveyAnswers from './ui/SurveyAnswers';

// ChartJS bileşenlerini kaydet
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const SurveyReports = () => {
    // State variables
    const [surveyTemplates, setSurveyTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [availableQuestions, setAvailableQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState("");
    const [quarterlyData, setQuarterlyData] = useState([]);
    const [questionAnalysis, setQuestionAnalysis] = useState([]);
    const [surveySummary, setSurveySummary] = useState(null);
    const [viewType, setViewType] = useState("bar");
    const [year, setYear] = useState(new Date().getFullYear());
    // Yıl listesi elle yazılmaz: şablonun yanıt aldığı yıllar backend'den gelir.
    const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
    // İlk istek daha başlamadan liste boş görünüp "anket bulunamadı" yazmasın.
    const [loading, setLoading] = useState(true);
    // Soru analizi kendi göstergesiyle yüklenir: ortak "loading" bütün sayfayı
    // kaldırdığı için soru değiştirmek sayfa yenileniyormuş gibi görünüyordu.
    const [questionLoading, setQuestionLoading] = useState(false);
    const [error, setError] = useState(null);
    // Masa başı özet: yalnızca masa numarasıyla gelen yanıtı olan firmalarda dolu gelir.
    const [tableSummary, setTableSummary] = useState([]);
    const [companyResponses, setCompanyResponses] = useState([]);
    const [tableReport, setTableReport] = useState(null);
    // Doldurulan anket listesinden açılan cevap penceresi.
    const [responseDetail, setResponseDetail] = useState(null);
    // Şıklı soruların şık dağılımı; şıklı soru yoksa boş gelir.
    const [choiceBreakdown, setChoiceBreakdown] = useState([]);

    // Initial load
    useEffect(() => {
        fetchSurveyTemplates();
    }, []);

    // When template is selected
    useEffect(() => {
        if (selectedTemplateId) {
            fetchAvailableYears(selectedTemplateId);
            fetchAvailableQuestions(selectedTemplateId);
            fetchQuarterlyReport(selectedTemplateId, year);
            fetchSurveySummary(selectedTemplateId, year);
            fetchChoiceBreakdown(selectedTemplateId, year);
        }
    }, [selectedTemplateId, year]);

    // When question is selected
    useEffect(() => {
        if (selectedTemplateId && selectedQuestion) {
            fetchQuestionAnalysis(selectedTemplateId, year, selectedQuestion);
        }
    }, [selectedTemplateId, selectedQuestion, year]);

    // Masa özeti ve masa raporunda kullanılacak yanıtlar firma bazlıdır.
    useEffect(() => {
        const companyId = surveyTemplates.find(t => t.id === selectedTemplateId)?.companyId;
        if (!companyId) {
            setTableSummary([]);
            setCompanyResponses([]);
            return;
        }

        const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
        axios.get(`${API_BASE_URL}/survey-responses/company/${companyId}/tables`, { headers })
            .then(res => setTableSummary(Array.isArray(res.data) ? res.data : []))
            .catch(() => setTableSummary([]));
        axios.get(`${API_BASE_URL}/survey-responses/company/${companyId}`, { headers })
            .then(res => setCompanyResponses(Array.isArray(res.data) ? res.data : []))
            .catch(() => setCompanyResponses([]));
    }, [selectedTemplateId, surveyTemplates]);

    /** Masa raporu: o masanın yanıtları AI analiz modalının beklediği tek yoruma indirgenir. */
    const openTableReport = (table) => {
        const rows = companyResponses.filter(r => r.tableNumber === table.tableNumber);
        const comments = rows.map(r => r.comment).filter(Boolean);

        // Tüm yanıtların soru bazlı puan ortalaması
        const sums = {};
        rows.forEach(r => Object.entries(r.ratings || {}).forEach(([q, v]) => {
            sums[q] = sums[q] || { total: 0, count: 0 };
            sums[q].total += v;
            sums[q].count += 1;
        }));
        const ratings = Object.fromEntries(
            Object.entries(sums).map(([q, { total, count }]) => [q, Math.round((total / count) * 10) / 10])
        );

        setTableReport({
            // Modal başlığında "Müşteri" alanı olarak gösterilir.
            name: `Masa ${table.tableNumber}`,
            tableNumber: table.tableNumber,
            comment: comments.join(' | ')
                || `Masa ${table.tableNumber}: ${table.positive} olumlu, ${table.negative} olumsuz yanıt.`,
            sentiment: table.positive >= table.negative ? 'positive' : 'negative',
            sentimentScore: table.total ? table.positive / table.total : 0,
            ratings
        });
    };

    // API Functions
    const fetchSurveyTemplates = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/survey-templates`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setSurveyTemplates(response.data);
            setError(null);

            // Auto-select first template
            if (response.data.length > 0) {
                setSelectedTemplateId(response.data[0].id);
            }
        } catch (err) {
            setError("Anketler yüklenirken bir hata oluştu: " + err.message);
            console.error("Error fetching survey templates:", err);
        } finally {
            setLoading(false);
        }
    };

    // Yanıt bulunan yıllar; seçili yıl listede yoksa en güncel yıla düşülür.
    const fetchAvailableYears = async (templateId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/survey-reports/available-years`, {
                params: { surveyTemplateId: templateId },
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const years = Array.isArray(response.data) && response.data.length > 0
                ? response.data
                : [new Date().getFullYear()];

            setAvailableYears(years);
            if (!years.includes(year)) {
                setYear(years[0]);
            }
        } catch (err) {
            console.error("Error fetching available years:", err);
            setAvailableYears([new Date().getFullYear()]);
        }
    };

    const fetchAvailableQuestions = async (templateId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/survey-reports/available-questions`, {
                params: { surveyTemplateId: templateId },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setAvailableQuestions(response.data || []);
            setError(null);

            // Auto-select first question
            if (response.data && response.data.length > 0) {
                setSelectedQuestion(response.data[0]);
            }
        } catch (err) {
            console.error("Error fetching available questions:", err);
            setAvailableQuestions([]);
        }
    };

    const fetchQuarterlyReport = async (templateId, selectedYear) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/survey-reports/quarterly`, {
                params: {
                    surveyTemplateId: templateId,
                    year: selectedYear
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setQuarterlyData(response.data || []);
            setError(null);
        } catch (err) {
            setError("Çeyrek dönemlik veriler yüklenirken bir hata oluştu: " +
                (err.response?.data?.message || err.message));
            console.error("Error fetching quarterly data:", err);
            setQuarterlyData([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuestionAnalysis = async (templateId, selectedYear, questionText) => {
        if (!questionText) return;

        setQuestionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/survey-reports/question-analysis`, {
                params: {
                    surveyTemplateId: templateId,
                    year: selectedYear,
                    questionText: questionText
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setQuestionAnalysis(response.data || []);
            setError(null);
        } catch (err) {
            console.error("Error fetching question analysis:", err);
            setQuestionAnalysis([]);
        } finally {
            setQuestionLoading(false);
        }
    };

    const fetchChoiceBreakdown = async (templateId, selectedYear) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/survey-reports/choice-breakdown`, {
                params: { surveyTemplateId: templateId, year: selectedYear },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setChoiceBreakdown(response.data || []);
        } catch (err) {
            console.error("Error fetching choice breakdown:", err);
            setChoiceBreakdown([]);
        }
    };

    const fetchSurveySummary = async (templateId, selectedYear) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/survey-reports/summary`, {
                params: {
                    surveyTemplateId: templateId,
                    year: selectedYear
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setSurveySummary(response.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching survey summary:", err);
            setSurveySummary(null);
        }
    };

    // Event Handlers
    const handleTemplateChange = (e) => {
        setSelectedTemplateId(e.target.value);
        setSelectedQuestion("");
        setQuestionAnalysis([]);
    };

    const handleQuestionChange = (e) => {
        setSelectedQuestion(e.target.value);
    };

    const handleYearChange = (e) => {
        setYear(parseInt(e.target.value));
    };

    const handleViewTypeChange = (type) => {
        setViewType(type);
    };

    // Chart Data Preparation Functions
    const prepareQuarterlyChartData = () => {
        if (!quarterlyData || quarterlyData.length === 0) {
            return {
                labels: [],
                datasets: []
            };
        }

        const labels = quarterlyData.map(item => item.quarter);
        const averageRatings = quarterlyData.map(item =>
            parseFloat((item.averageRating || 0).toFixed(2))
        );
        const totalResponses = quarterlyData.map(item => item.totalResponses || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Ortalama Puan',
                    data: averageRatings,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Toplam Yanıt',
                    data: totalResponses,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        };
    };

    const prepareQuestionAnalysisData = () => {
        if (!questionAnalysis || questionAnalysis.length === 0) {
            return {
                labels: [],
                datasets: []
            };
        }

        const labels = questionAnalysis.map(item => item.period);
        const averageRatings = questionAnalysis.map(item =>
            parseFloat((item.averageRating || 0).toFixed(2))
        );
        const responseCounts = questionAnalysis.map(item => item.responseCount || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Ortalama Puan',
                    data: averageRatings,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Yanıt Sayısı',
                    data: responseCounts,
                    backgroundColor: 'rgba(255, 206, 86, 0.5)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        };
    };

    const prepareSentimentPieData = () => {
        if (!surveySummary || !surveySummary.sentimentAnalysis) {
            return {
                labels: [],
                datasets: []
            };
        }

        const sentimentData = surveySummary.sentimentAnalysis;
        const labels = Object.keys(sentimentData);
        const data = Object.values(sentimentData);

        const backgroundColors = [
            'rgba(75, 192, 192, 0.7)', // positive - yeşil
            'rgba(255, 99, 132, 0.7)', // negative - kırmızı
            'rgba(255, 206, 86, 0.7)'  // neutral - sarı
        ];

        return {
            labels: labels.map(label => {
                switch(label) {
                    case 'positive': return 'Pozitif';
                    case 'negative': return 'Negatif';
                    case 'neutral': return 'Nötr';
                    default: return label;
                }
            }),
            datasets: [
                {
                    data,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderColor: backgroundColors.slice(0, labels.length).map(color => color.replace('0.7', '1')),
                    borderWidth: 1
                }
            ]
        };
    };

    // Chart Options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Ortalama Puan'
                },
                min: 0,
                max: 5,
                ticks: {
                    stepSize: 1
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Yanıt Sayısı'
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
        plugins: {
            title: {
                display: true,
                text: 'Anket Sonuçları'
            }
        }
    };

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
            },
            title: {
                display: true,
                text: 'Duygu Analizi Dağılımı'
            }
        }
    };

    // Render Functions
    const renderTemplateOptions = () => {
        // Liste boşken "yükleniyor" demek, yeni açılan hesapta hiç anket
        // olmadığında da sonsuza kadar yükleniyor görünmesine yol açıyordu.
        if (surveyTemplates.length === 0) {
            return <option value="">{loading ? 'Anketler yükleniyor...' : 'Anket bulunamadı'}</option>;
        }

        return (
            <>
                <option value="">Anket Seçin</option>
                {surveyTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                        {template.name}
                    </option>
                ))}
            </>
        );
    };

    const renderQuestionOptions = () => {
        if (availableQuestions.length === 0) {
            return <option value="">Soru bulunamadı</option>;
        }

        return (
            <>
                <option value="">Soru seçin...</option>
                {availableQuestions.map((question, index) => (
                    <option key={index} value={question}>
                        {question.length > 50 ? question.substring(0, 47) + '...' : question}
                    </option>
                ))}
            </>
        );
    };

    const renderSummaryCards = () => {
        if (!surveySummary) return null;

        const cards = [
            {
                title: 'Toplam Yanıt',
                value: surveySummary.totalResponses || 0,
                bg: 'from-blue-500 to-blue-600',
                text: 'text-blue-100'
            },
            {
                title: 'Genel Ortalama',
                value: (surveySummary.overallAverageRating || 0).toFixed(1),
                bg: 'from-green-500 to-green-600',
                text: 'text-green-100'
            },
            {
                title: 'Pozitif Yanıt',
                value: surveySummary.sentimentAnalysis?.positive || 0,
                bg: 'from-purple-500 to-purple-600',
                text: 'text-purple-100'
            },
            {
                title: 'Negatif Yanıt',
                value: surveySummary.sentimentAnalysis?.negative || 0,
                bg: 'from-orange-500 to-orange-600',
                text: 'text-orange-100'
            }
        ];

        // Yıldızlı soruların 15'lik puanı: 6 ve altı Kötü, 10 ve üstü Mükemmel.
        if (surveySummary.ratingScore !== undefined) {
            cards.push({
                title: `Puan Değerlendirmesi · ${surveySummary.ratingLabel}`,
                value: `${surveySummary.ratingScore}/${surveySummary.ratingScale}`,
                bg: surveySummary.ratingSentiment === 'positive'
                    ? 'from-emerald-500 to-emerald-600'
                    : surveySummary.ratingSentiment === 'negative'
                        ? 'from-red-500 to-red-600'
                        : 'from-amber-500 to-amber-600',
                text: 'text-white/80'
            });
        }

        return cards.map((card, index) => (
            <div key={index} className={`bg-gradient-to-r ${card.bg} p-6 rounded-xl text-white`}>
                <div className="text-3xl font-bold">{card.value}</div>
                <div className={card.text}>{card.title}</div>
            </div>
        ));
    };

    const renderQuarterlyTable = () => {
        if (quarterlyData.length === 0) return null;

        return quarterlyData.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.quarter}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(item.averageRating || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(item.totalResponses || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {(item.positiveResponses || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {(item.negativeResponses || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(item.neutralResponses || 0).toLocaleString()}
                </td>
            </tr>
        ));
    };

    /**
     * Şıklı sorular: şablondaki soru/şıklar + yanıtlardan gelen sayılar. Listeyi
     * şablondan kurmak, hiç seçilmemiş şıkkın ve hiç yanıt almamış sorunun da
     * görünmesini sağlar - aksi halde bölüm tamamen kayboluyordu.
     */
    const buildChoiceQuestions = () => {
        const template = surveyTemplates.find(t => t.id === selectedTemplateId);
        const answered = new Map(choiceBreakdown.map(q => [q.questionText, q]));

        const fromTemplate = (template?.questions || [])
            .filter(question => question.type === 'MULTIPLE_CHOICE')
            .map(question => {
                const data = answered.get(question.text);
                answered.delete(question.text);

                const counts = new Map((data?.options || []).map(o => [o.option, o]));
                // Şablon sırası korunur; şablondan sonra silinmiş şıklar sona eklenir.
                const names = [...new Set([...(question.options || []), ...counts.keys()])];

                return {
                    questionText: question.text,
                    totalAnswers: data?.totalAnswers || 0,
                    options: names
                        .map(name => counts.get(name) || { option: name, count: 0, percentage: 0 })
                        .sort((a, b) => b.count - a.count)
                };
            });

        // Şablondan silinmiş ama yanıtı olan sorular da raporda kalır.
        return [...fromTemplate, ...answered.values()];
    };

    const choiceQuestions = buildChoiceQuestions();

    const formatDateTime = (value) =>
        value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-';

    // Seçili şablonun yanıtları, yeniden eskiye.
    const templateResponses = companyResponses
        .filter(response => response.surveyTemplateId === selectedTemplateId)
        .sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Başlık */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Anket Raporları</h1>
                <p className="text-gray-600">Anket sonuçlarını görselleştirin ve analiz edin</p>
            </div>

            {/* Filtreler */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="template-select" className="block text-sm font-semibold text-gray-700 mb-2">
                            Anket Seçin
                        </label>
                        <select
                            id="template-select"
                            value={selectedTemplateId}
                            onChange={handleTemplateChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 text-sm border"
                            disabled={loading || surveyTemplates.length === 0}
                        >
                            {renderTemplateOptions()}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="year-select" className="block text-sm font-semibold text-gray-700 mb-2">
                            Yıl Seçin
                        </label>
                        <select
                            id="year-select"
                            value={year}
                            onChange={handleYearChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 text-sm border"
                            disabled={loading}
                        >
                            {availableYears.map((availableYear) => (
                                <option key={availableYear} value={availableYear}>
                                    {availableYear}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Görünüm Tipi
                        </label>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleViewTypeChange("bar")}
                                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                    viewType === "bar"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                Bar Grafik
                            </button>
                            <button
                                onClick={() => handleViewTypeChange("line")}
                                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                    viewType === "line"
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                Çizgi Grafik
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hata Mesajı */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Yükleniyor Göstergesi */}
            {loading && (
                <div className="text-center p-12 bg-white rounded-xl shadow-md">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
                    <p className="mt-4 text-lg text-gray-600">Veriler yükleniyor...</p>
                </div>
            )}

            {/* Ana İçerik */}
            {!loading && selectedTemplateId && (
                <div className="space-y-8">
                    {/* Özet Kartlar */}
                    {surveySummary && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            {renderSummaryCards()}
                        </div>
                    )}

                    {/* Grafikler Satırı */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Çeyrek Dönem Grafiği */}
                        {quarterlyData.length > 0 && (
                            <div className="bg-white shadow-xl rounded-xl p-6 border">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Çeyrek Dönem Analizi</h2>
                                    <p className="text-gray-600 mt-1">{year} yılı çeyrek dönemlik sonuçlar</p>
                                </div>
                                <div className="h-80">
                                    {viewType === "bar" ? (
                                        <Bar data={prepareQuarterlyChartData()} options={chartOptions} />
                                    ) : (
                                        <Line data={prepareQuarterlyChartData()} options={chartOptions} />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Duygu Analizi */}
                        {surveySummary && surveySummary.sentimentAnalysis && (
                            <div className="bg-white shadow-xl rounded-xl p-6 border">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Duygu Analizi</h2>
                                    <p className="text-gray-600 mt-1">Yanıtların duygu dağılımı</p>
                                </div>
                                <div className="h-80">
                                    <Pie data={prepareSentimentPieData()} options={pieChartOptions} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Şıklı sorular: şık solda, yatay bar sağda. */}
                    {choiceQuestions.length > 0 && (
                        <div className="bg-white shadow-xl rounded-xl p-6 border">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Şıklı Soru Tercihleri</h2>
                                <p className="text-gray-600 mt-1">{year} yılında hangi şık ne kadar seçildi</p>
                            </div>

                            <div className="space-y-8">
                                {choiceQuestions.map((question) => (
                                    <div key={question.questionText}>
                                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                                            <h3 className="font-semibold text-gray-800">{question.questionText}</h3>
                                            <span className="text-sm text-gray-500">{question.totalAnswers} yanıt</span>
                                        </div>

                                        {question.totalAnswers === 0 ? (
                                            <p className="text-sm text-gray-500">Bu soruya {year} yılında hiç yanıt gelmemiş.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {question.options.map((option, index) => (
                                                    <div key={option.option} className="flex items-center gap-3">
                                                        <span
                                                            title={option.option}
                                                            className={`w-32 sm:w-48 shrink-0 truncate text-sm ${
                                                                index === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'
                                                            }`}
                                                        >
                                                            {option.option}
                                                        </span>
                                                        <div className="flex-1 h-5 rounded-full bg-gray-100">
                                                            <div
                                                                className={`h-5 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-blue-400'}`}
                                                                style={{ width: `${option.percentage}%` }}
                                                            />
                                                        </div>
                                                        <span className="w-24 shrink-0 text-right text-sm text-gray-600 whitespace-nowrap">
                                                            {option.count} · %{option.percentage}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Masa Başı Özet: karta tıklayınca o masanın AI analiz raporu açılır. */}
                    {tableSummary.length > 0 && (
                        <div className="bg-white shadow-xl rounded-xl p-6 border">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Masa Başı Özet</h2>
                                <p className="text-gray-600 mt-1">
                                    Masaların genel havası. Ayrıntılı rapor için bir masaya tıklayın.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {tableSummary.map(table => (
                                    <button
                                        key={table.tableNumber}
                                        type="button"
                                        onClick={() => openTableReport(table)}
                                        title={`Masa ${table.tableNumber} raporunu aç`}
                                        className={`rounded-lg border p-4 text-left transition-shadow hover:shadow-md ${
                                            table.positive >= table.negative
                                                ? 'border-green-200 bg-green-50'
                                                : 'border-red-200 bg-red-50'
                                        }`}
                                    >
                                        <p className="font-medium text-gray-900">Masa {table.tableNumber}</p>
                                        <div className="flex items-center gap-4 mt-3">
                                            <span className="flex items-center gap-1 text-green-700">
                                                <ThumbsUp className="w-4 h-4" />
                                                {table.positive}
                                            </span>
                                            <span className="flex items-center gap-1 text-red-700">
                                                <ThumbsDown className="w-4 h-4" />
                                                {table.negative}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">{table.total} yanıt · Raporu aç</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Doldurulan anketler: her satır tek bir müşterinin yanıtı.
                        Yorum yazmayan yanıtlar da listelenir. */}
                    {templateResponses.length > 0 && (
                        <div className="bg-white shadow-xl rounded-xl p-6 border">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Doldurulan Anketler</h2>
                                <p className="text-gray-600 mt-1">
                                    {templateResponses.length} yanıt · Verilen cevapları görmek için bir satıra tıklayın
                                </p>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {templateResponses.map((response, index) => (
                                    <button
                                        key={response.id || index}
                                        type="button"
                                        onClick={() => setResponseDetail(response)}
                                        className="flex w-full flex-wrap items-center gap-3 py-3 text-left hover:bg-gray-50"
                                    >
                                        <span className="w-40 shrink-0 text-sm text-gray-600">
                                            {formatDateTime(response.submissionDate)}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">Müşteri</span>
                                        {response.tableNumber && (
                                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                                Masa {response.tableNumber}
                                            </span>
                                        )}
                                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                                            response.sentiment === 'positive'
                                                ? 'bg-green-100 text-green-800'
                                                : response.sentiment === 'negative'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {response.sentiment === 'positive' ? 'Pozitif'
                                                : response.sentiment === 'negative' ? 'Negatif' : 'Nötr'}
                                        </span>
                                        <span className="flex-1 truncate text-sm text-gray-500">
                                            {response.comment || 'Yorum yazılmamış'}
                                        </span>
                                        <span className="text-sm font-medium text-blue-600">Cevapları gör</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Soru Analizi Bölümü */}
                    {availableQuestions.length > 0 && (
                        <div className="bg-white shadow-xl rounded-xl p-6 border">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Detaylı Soru Analizi</h2>
                                <p className="text-gray-600 mt-1">Belirli bir soruya ait aylık analiz</p>
                            </div>

                            <div className="mb-6">
                                <label htmlFor="question-select" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Analiz Edilecek Soruyu Seçin
                                </label>
                                <select
                                    id="question-select"
                                    value={selectedQuestion}
                                    onChange={handleQuestionChange}
                                    className="block w-full md:w-1/2 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 text-sm border"
                                    disabled={availableQuestions.length === 0}
                                >
                                    {renderQuestionOptions()}
                                </select>
                                {questionLoading && (
                                    <p className="mt-2 text-sm text-gray-500">Soru analizi yükleniyor...</p>
                                )}
                            </div>

                            {/* Soru Analizi Grafiği */}
                            {selectedQuestion && questionAnalysis.length > 0 && (
                                <div className="mt-6">
                                    <div className="h-96">
                                        {viewType === "bar" ? (
                                            <Bar data={prepareQuestionAnalysisData()} options={chartOptions} />
                                        ) : (
                                            <Line data={prepareQuestionAnalysisData()} options={chartOptions} />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Veri Tabloları */}
                    {quarterlyData.length > 0 && (
                        <div className="bg-white shadow-xl rounded-xl p-6 border">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Çeyrek Dönem Detay Tablosu</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dönem</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ortalama Puan</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Yanıt</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pozitif</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Negatif</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nötr</th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {renderQuarterlyTable()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Veri Yok Mesajı */}
                    {quarterlyData.length === 0 && (
                        <div className="text-center p-12 bg-white rounded-xl shadow-md">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <h3 className="mt-2 text-lg font-medium text-gray-900">Veri bulunamadı</h3>
                            <p className="mt-1 text-gray-500">
                                Bu anket için {year} yılına ait yanıt verileri bulunmamaktadır.
                            </p>
                        </div>
                    )}
                </div>
            )}

            <AIAnalysisModal
                isOpen={!!tableReport}
                onClose={() => setTableReport(null)}
                commentData={tableReport}
            />

            {responseDetail && (
                <DetailModal
                    title="Ankete Verilen Cevaplar"
                    rows={[
                        ['Müşteri', 'Müşteri'],
                        responseDetail.tableNumber ? ['Masa', responseDetail.tableNumber] : null,
                        ['Tarih', formatDateTime(responseDetail.submissionDate)]
                    ]}
                    onClose={() => setResponseDetail(null)}
                >
                    <SurveyAnswers response={responseDetail} />
                </DetailModal>
            )}
        </div>
    );
};

export default SurveyReports;