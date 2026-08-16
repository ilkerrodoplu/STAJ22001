import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Calendar, Activity } from 'lucide-react';

// Services
import { dashboardService } from '../../services/dashboardService';

// Utils
import {
    formatQuestionAverages,
    formatSentimentStats,
    formatDailyTrend,
    getStatCardColor
} from '../../utils/dashboardUtils';

// Components
import StatCard from '../../components/dashboard/StatCard';
import SentimentChart from '../../components/dashboard/SentimentChart';
import QuestionAveragesChart from '../../components/dashboard/QuestionAveragesChart';
import DailyTrendChart from '../../components/dashboard/DailyTrendChart';
import CommentsTable from '../../components/dashboard/CommentsTable';
import Loading from '../../components/ui/Loading';
import Error from '../../components/ui/Error';

/**
 * Şirket paneli. Süper adminin karşılığı /admin/super/dashboard'tır; ayrım
 * artık burada değil rota katmanında yapılır, iki rol aynı adresi paylaşmaz.
 */
export default function AdminDashboard() {
    const [dashboardData, setDashboardData] = useState({
        generalAvg: 0,
        questionAverages: [],
        sentimentStats: [],
        dailyTrend: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userInfo, setUserInfo] = useState(null);

// useEffect içinde user bilgisini al
    useEffect(() => {
        // User bilgisini localStorage'dan al
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUserInfo(parsedUser);
        }
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await dashboardService.getAllDashboardData();

            setDashboardData({
                generalAvg: data.generalAverage,
                questionAverages: formatQuestionAverages(data.questionAverages),
                sentimentStats: formatSentimentStats(data.sentimentStats),
                dailyTrend: formatDailyTrend(data.dailyTrend)

            });
        } catch (err) {
            console.error('Dashboard data fetch error:', err);
            setError(err?.message || 'Veriler alınırken hata oluştu!');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchDashboardData();
    };

    if (loading) {
        return (
            <div className="p-6 bg-gradient-to-bl from-gray-50 to-blue-50 min-h-screen">
                <Loading message="Dashboard yükleniyor..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-gradient-to-bl from-gray-50 to-blue-50 min-h-screen">
                <Error message={error} onRetry={handleRefresh} />
            </div>
        );
    }

    const {generalAvg, questionAverages, sentimentStats, dailyTrend} = dashboardData;
    const totalSentiments = sentimentStats.reduce((sum, s) => sum + s.value, 0);
    const todayResponses = dailyTrend.slice(-1)[0]?.count || 0;

    return (
        <div className="p-6 space-y-8 bg-gradient-to-bl from-gray-50 to-blue-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
                    <p className="text-gray-600">Anket sonuçlarınızın özeti</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                    <span>🔄</span>
                    <span>Yenile</span>
                </button>
            </div>

            {/* Stat Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Genel Ortalama"
                    value={Number(generalAvg).toFixed(2)}
                    subtitle="5 üzerinden"
                    color={getStatCardColor('average')}
                    icon={<Star size={30} />}
                />
                <StatCard
                    title="Toplam Yanıt"
                    value={totalSentiments.toLocaleString()}
                    subtitle="Tüm zamanlar"
                    color={getStatCardColor('total')}
                    icon={<Activity size={30} />}
                />
                <StatCard
                    title="Bugünkü Yanıt"
                    value={todayResponses.toLocaleString()}
                    subtitle="Son 24 saat"
                    color={getStatCardColor('today')}
                    icon={<Calendar size={30} />}
                />
            </div>

            {/* Grafikler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Duygu Pie */}
                <SentimentChart data={sentimentStats} />

                {/* Soru Ortalamaları Bar */}
                <div className="md:col-span-2">
                    <QuestionAveragesChart data={questionAverages} />
                </div>
            </div>

            {/* Zaman Serisi */}
            <DailyTrendChart data={dailyTrend} />


        </div>
    );
}