import axios from 'axios';
import { localSummary } from './localSummary';

// AI agent adresi. Yapılandırılmamışsa eski davranış korunur; agent'a
// ulaşılamazsa analiz panel içinde üretilen özete düşer (bkz. localSummary).
const AI_API_BASE_URL = process.env.REACT_APP_AI_API_URL
    || `${process.env.REACT_APP_API_URL}/analyze-api`;

const axiosInstance = axios.create({
    baseURL: AI_API_BASE_URL,
    timeout: 45000, // AI analizi için daha uzun timeout
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

export const aiAnalysisService = {
    /**
     * Önce AI agent'ı denenir; agent yapılandırılmamış ya da ulaşılamıyorsa
     * analiz yerel özete düşer. Böylece buton her koşulda bir sonuç gösterir.
     */
    analyzeComment: async (commentData = {}) => {
        try {
            const { data } = await axiosInstance.post('/analyze/', {
                kategori: commentData.category || 'genel',
                companyName: commentData.companyName || 'İşletme',
                ratings: commentData.ratings,
                choices: commentData.choices,
                comment: commentData.comment,
                sentiment: commentData.sentiment,
                sentimentScore: commentData.sentimentScore,
                interaction: 'normal'
            });

            if (data?.analysis) {
                return data.analysis;
            }
            if (typeof data === 'string' && data.trim()) {
                return data;
            }
            if (data && typeof data === 'object') {
                return JSON.stringify(data, null, 2);
            }

            console.warn('AI agent boş yanıt döndü; yerel özet gösteriliyor.');
            return localSummary(commentData);
        } catch (error) {
            console.warn('AI agent kullanılamadı, yerel özete düşülüyor:', {
                message: error.message,
                status: error.response?.status,
                url: AI_API_BASE_URL
            });
            return localSummary(commentData);
        }
    }
};
