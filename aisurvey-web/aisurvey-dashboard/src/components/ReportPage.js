
import { useState, useEffect } from "react";
import axios from "axios";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import "./ReportPage.css"; // Stil dosyası import ediliyor


// ChartJS bileşenlerini kaydet
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

export default function SurveyReports() {
    const [questions, setQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState("67df5bfd67e70f0bbd86cbd1");
    const [quarterlyData, setQuarterlyData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [year, setYear] = useState(2024);
    const [viewType, setViewType] = useState("bar"); // "bar" or "line"

    // Fetch all questions on component mount
    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                // Bu fonksiyon normalde tüm soruları bir API'den alacaktı
                // Ancak bu örnek için sabit bir soru listesi tanımlıyoruz
                const sampleQuestions = [
                    { id: "67df5bfd67e70f0bbd86cbc8", text: "Yemeklerin lezzeti nasıldı?", category: "yemek" },
                    { id: "67df5bfd67e70f0bbd86cbc9", text: "Servis hızı nasıldı?", category: "servis" },
                    { id: "67df5bfd67e70f0bbd86cbca", text: "Temizlik ve hijyen nasıldı?", category: "mekan" },
                    { id: "67df5bfd67e70f0bbd86cbcb", text: "Fiyat-performans değerlendirmeniz?", category: "değer" },
                    { id: "67df5bfd67e70f0bbd86cbcc", text: "Personelin ilgisi nasıldı?", category: "servis" },
                    { id: "67df5bfd67e70f0bbd86cbcd", text: "Firma atmosferi nasıldı?", category: "mekan" },
                    { id: "67df5bfd67e70f0bbd86cbce", text: "Menü çeşitliliği yeterli miydi?", category: "yemek" },
                    { id: "67df5bfd67e70f0bbd86cbcf", text: "Çocuklar için uygunluk nasıldı?", category: "aile" },
                    { id: "67df5bfd67e70f0bbd86cbd0", text: "Genel memnuniyet düzeyiniz?", category: "genel" },
                    { id: "67df5bfd67e70f0bbd86cbd1", text: "Tekrar ziyaret etme olasılığınız nedir?", category: "genel" }
                ];

                setQuestions(sampleQuestions);
                if (sampleQuestions.length > 0) {
                    setSelectedQuestion(sampleQuestions[9].id); // Default to last question
                }
            } catch (err) {
                setError("Sorular yüklenirken bir hata oluştu: " + err.message);
                console.error("Error fetching questions:", err);
            }
        };

        fetchQuestions();
    }, []);

    // Fetch quarterly data when a question is selected
    useEffect(() => {
        if (selectedQuestion) {
            fetchQuarterlyData();
        }
    }, [selectedQuestion, year]);

    const fetchQuarterlyData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/v1/reports/quarterly/${selectedQuestion}?year=${year}`,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            setQuarterlyData(response.data);
            setError(null);
        } catch (err) {
            setError("Çeyrek dönemlik veriler yüklenirken bir hata oluştu: " + err.message);
            console.error("Error fetching quarterly data:", err);
        } finally {
            setLoading(false);
        }
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

    // Chart.js için veri hazırlama
    const prepareChartData = () => {
        if (!quarterlyData || !quarterlyData.periodRatings) {
            return {
                labels: [],
                datasets: []
            };
        }

        const labels = quarterlyData.periodRatings.map(period => period.period);
        const averageRatings = quarterlyData.periodRatings.map(period =>
            parseFloat(period.averageRating.toFixed(2))
        );
        const responseCounts = quarterlyData.periodRatings.map(period => period.responseCount);

        return {
            labels,
            datasets: [
                {
                    label: 'Ortalama Puan',
                    data: averageRatings,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Yanıt Sayısı',
                    data: responseCounts,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        };
    };

    // Chart.js için seçenekler
    const chartOptions = {
        responsive: true,
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
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-center">Anket Raporları</h1>

            {/* Filters and controls */}
            <div className="mb-8 bg-gray-50 p-5 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="question-select" className="block text-sm font-medium text-gray-700 mb-1">
                            Soru Seçin
                        </label>
                        <select
                            id="question-select"
                            value={selectedQuestion}
                            onChange={handleQuestionChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                            disabled={loading || questions.length === 0}
                        >
                            {questions.length === 0 ? (
                                <option value="">Yükleniyor...</option>
                            ) : (
                                questions.map((question) => (
                                    <option key={question.id} value={question.id}>
                                        {question.text}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="year-select" className="block text-sm font-medium text-gray-700 mb-1">
                            Yıl Seçin
                        </label>
                        <select
                            id="year-select"
                            value={year}
                            onChange={handleYearChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3"
                            disabled={loading}
                        >
                            <option value="2023">2023</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Görünüm Tipi
                        </label>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleViewTypeChange("bar")}
                                className={`px-4 py-2 rounded-md ${
                                    viewType === "bar"
                                        ? "bg-blue-600 text-white"
                                        : "bg-white text-gray-700 border border-gray-300"
                                }`}
                            >
                                Bar Grafik
                            </button>
                            <button
                                onClick={() => handleViewTypeChange("line")}
                                className={`px-4 py-2 rounded-md ${
                                    viewType === "line"
                                        ? "bg-blue-600 text-white"
                                        : "bg-white text-gray-700 border border-gray-300"
                                }`}
                            >
                                Çizgi Grafik
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            {/* Loading indicator */}
            {loading && (
                <div className="text-center p-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-600">Veriler yükleniyor...</p>
                </div>
            )}

            {/* Quarterly data visualization */}
            {!loading && quarterlyData && (
                <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold">
                            {quarterlyData.questionText} ({quarterlyData.category})
                        </h2>
                        <p className="text-gray-600 mt-1">
                            {year} yılı çeyrek dönemlik değerlendirme sonuçları
                        </p>
                    </div>

                    <div className="mt-6">
                        <div className="h-96">
                            {viewType === "bar" ? (
                                <Bar data={prepareChartData()} options={chartOptions} />
                            ) : (
                                <Line data={prepareChartData()} options={chartOptions} />
                            )}
                        </div>
                    </div>

                    {/* Summary Table */}
                    <div className="mt-10 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Çeyrek Dönem
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ortalama Puan
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Yanıt Sayısı
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {quarterlyData.periodRatings.map((period, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {period.period}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {period.averageRating.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {period.responseCount.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                            <tr>
                                <td className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Toplam / Ortalama
                                </td>
                                <td className="px-6 py-3 text-left text-xs font-medium text-gray-900">
                                    {(quarterlyData.periodRatings.reduce((sum, period) => sum + period.averageRating, 0) / quarterlyData.periodRatings.length).toFixed(2)}
                                </td>
                                <td className="px-6 py-3 text-left text-xs font-medium text-gray-900">
                                    {quarterlyData.periodRatings.reduce((sum, period) => sum + period.responseCount, 0).toLocaleString()}
                                </td>
                            </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
