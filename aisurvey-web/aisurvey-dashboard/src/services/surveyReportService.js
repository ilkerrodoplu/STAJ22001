import axios from 'axios';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

export const surveyReportService = {
    // Çeyrek dönemlik rapor
    getQuarterlyReport: async (surveyTemplateId, year) => {
        const response = await axios.get(`${API_BASE_URL}/survey-reports/quarterly`, {
            params: { surveyTemplateId, year },
            headers: getAuthHeaders()
        });
        return response.data;
    },

    // Soru analizi
    getQuestionAnalysis: async (surveyTemplateId, year, questionText) => {
        const response = await axios.get(`${API_BASE_URL}/survey-reports/question-analysis`, {
            params: { surveyTemplateId, year, questionText },
            headers: getAuthHeaders()
        });
        return response.data;
    },

    // Mevcut sorular
    getAvailableQuestions: async (surveyTemplateId) => {
        const response = await axios.get(`${API_BASE_URL}/survey-reports/available-questions`, {
            params: { surveyTemplateId },
            headers: getAuthHeaders()
        });
        return response.data;
    },

    // Anket özeti
    getSurveySummary: async (surveyTemplateId, year) => {
        const response = await axios.get(`${API_BASE_URL}/survey-reports/summary`, {
            params: { surveyTemplateId, year },
            headers: getAuthHeaders()
        });
        return response.data;
    },

    // Anket şablonları (ek endpoint - varsa)
    getSurveyTemplates: async () => {
        const response = await axios.get(`${API_BASE_URL}/survey-templates`, {
            headers: getAuthHeaders()
        });
        return response.data;
    }
};