// SurveyPieChart.js
import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const SurveyPieChart = ({ surveyData }) => {
    // Veri yoksa veya sadece yanıt olmayan dönemler varsa uygun mesaj göster
    const hasResponses = surveyData.periodRatings.some(period => period.responseCount > 0);

    if (!hasResponses) {
        return <div className="no-data-message">Bu anket için henüz veri bulunmamaktadır.</div>;
    }

    // Sadece yanıt içeren dönemleri filtrele
    const periodsWithResponses = surveyData.periodRatings.filter(
        period => period.responseCount > 0
    );

    // Chart.js için verileri hazırla
    const chartData = {
        labels: periodsWithResponses.map(period => period.period),
        datasets: [
            {
                label: 'Ortalama Puan',
                data: periodsWithResponses.map(period => period.averageRating),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: `"${surveyData.questionText}" Sorusu için Ortalama Puanlar`,
                font: {
                    size: 16,
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const period = periodsWithResponses[context.dataIndex];
                        return `Ortalama: ${period.averageRating.toFixed(1)} (${period.responseCount} yanıt)`;
                    }
                }
            }
        },
    };

    return (
        <div className="chart-container">
            <Pie data={chartData} options={options} />
        </div>
    );
};

export default SurveyPieChart;