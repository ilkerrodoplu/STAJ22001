import React, { useState, useEffect } from 'react';
import SurveyPieChart from './SurveyPieChart';
import './SurveyReportPage.css';

const SurveyReportPage = () => {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error] = useState(null);

    useEffect(() => {
        // Gerçek bir API'den veri çekme işlemi burada olacak
        // Şimdilik örnek veriyi kullanıyoruz
        const exampleData = {
            "questionId": "67df5bfd67e70f0bbd86cbd1",
            "questionText": "Tekrar ziyaret etme olasılığınız nedir?",
            "category": "genel",
            "periodRatings": [
                {
                    "period": "2025-Q1",
                    "averageRating": 5.0,
                    "responseCount": 4
                },
                {
                    "period": "2025-Q2",
                    "averageRating": 0.0,
                    "responseCount": 0
                },
                {
                    "period": "2025-Q3",
                    "averageRating": 0.0,
                    "responseCount": 0
                },
                {
                    "period": "2025-Q4",
                    "averageRating": 0.0,
                    "responseCount": 0
                }
            ]
        };

        // Gerçek uygulamada burası API çağrısı olacak
        setTimeout(() => {
            setSurveys([exampleData]);
            setLoading(false);
        }, 500);
    }, []);

    if (loading) {
        return <div className="loading">Yükleniyor...</div>;
    }

    if (error) {
        return <div className="error">Hata: {error}</div>;
    }

    return (
        <div className="survey-report-container">
            <h1 className="report-title">Anket Raporları</h1>

            {surveys.length === 0 ? (
                <div className="no-data">Görüntülenecek anket verisi bulunmamaktadır.</div>
            ) : (
                <div className="charts-grid">
                    {surveys.map(survey => (
                        <div key={survey.questionId} className="chart-card">
                            <h2 className="question-category">{survey.category.toUpperCase()}</h2>
                            <SurveyPieChart surveyData={survey} />
                            <div className="survey-details">
                                <p><strong>Soru:</strong> {survey.questionText}</p>
                                <p><strong>Toplam Yanıt:</strong> {
                                    survey.periodRatings.reduce((total, period) => total + period.responseCount, 0)
                                }</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SurveyReportPage;