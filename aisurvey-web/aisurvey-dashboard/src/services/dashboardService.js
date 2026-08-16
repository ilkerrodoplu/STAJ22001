
import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1/reports`;

/**
 * localStorage'dan companyId okur (user veya currentUser içinde).
 * Bulunamazsa hata fırlatır.
 */
function readCompanyId() {
    const userStr =
        localStorage.getItem('user') ||
        localStorage.getItem('currentUser') ||
        '';
    try {
        const companyId = userStr ? JSON.parse(userStr)?.companyId : undefined;
        if (!companyId) throw new Error();
        return companyId;
    } catch {
        throw new Error('companyId bulunamadı (localStorage.user/currentUser içinde bekleniyor).');
    }
}

/**
 * localStorage'dan token okur (authToken veya token).
 * Yoksa undefined döner (bazı ekranlar login öncesi olabilir).
 */
function readToken() {
    return (
        localStorage.getItem('authToken') ||
        localStorage.getItem('token') ||
        undefined
    );
}

/**
 * Tek bir axios instance: companyId ve Authorization otomatik eklenir.
 * URL parametreleri için her yerde temiz bir şekilde 'params' kullanırız.
 */
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000
});

api.interceptors.request.use((config) => {
    const companyId = readCompanyId();

    // params birleştir
    config.params = { ...(config.params || {}), companyId };

    // token varsa Authorization header ekle
    const token = readToken();
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        // İstersen uyarı verebilirsin; burada sessiz geçiyoruz
        // throw new Error('Token bulunamadı (authToken/token).');
    }

    return config;
});

export const dashboardService = {
    // Genel ortalama
    getGeneralAverage: async () => {
        const { data } = await api.get('/general-average');
        return data;
    },

    // Soru ortalamaları
    getQuestionAverages: async () => {
        const { data } = await api.get('/question-averages');
        return data;
    },

    // Duygu istatistikleri
    getSentimentStats: async () => {
        const { data } = await api.get('/sentiments');
        return data;
    },

    // Günlük trend
    getDailyTrend: async () => {
        const { data } = await api.get('/daily-trend');
        return data;
    },



    /**
     * Tüm verileri tek seferde paralel getir.
     * Not: Backend bir /all endpoint'i sunabiliyorsa onu tercih etmek daha da hızlı olur.
     */
    getAllDashboardData: async () => {
        const [avgRes, qAvgRes, sentimentRes, trendRes] = await Promise.all([
            api.get('/general-average'),
            api.get('/question-averages'),
            api.get('/sentiments'),
            api.get('/daily-trend')
        ]);

        return {
            generalAverage: avgRes.data,
            questionAverages: qAvgRes.data,
            sentimentStats: sentimentRes.data,
            dailyTrend: trendRes.data
        };
    }
};