export const chartColors = {
    primary: {
        background: 'rgba(54, 162, 235, 0.5)',
        border: 'rgba(54, 162, 235, 1)'
    },
    secondary: {
        background: 'rgba(75, 192, 192, 0.5)',
        border: 'rgba(75, 192, 192, 1)'
    },
    success: {
        background: 'rgba(75, 192, 192, 0.7)',
        border: 'rgba(75, 192, 192, 1)'
    },
    danger: {
        background: 'rgba(255, 99, 132, 0.7)',
        border: 'rgba(255, 99, 132, 1)'
    },
    warning: {
        background: 'rgba(255, 206, 86, 0.7)',
        border: 'rgba(255, 206, 86, 1)'
    }
};

export const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: {
        legend: {
            position: 'top',
        }
    }
};

export const dualAxisOptions = {
    ...defaultChartOptions,
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
    }
};

export const pieChartOptions = {
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

export const formatQuarterlyData = (data, viewType = 'bar') => {
    if (!data || data.length === 0) {
        return { labels: [], datasets: [] };
    }

    const labels = data.map(item => item.quarter || `Q${item.quarterNumber}`);
    const averageRatings = data.map(item => parseFloat((item.averageRating || 0).toFixed(2)));
    const totalResponses = data.map(item => item.totalResponses || 0);

    return {
        labels,
        datasets: [
            {
                label: 'Ortalama Puan',
                data: averageRatings,
                backgroundColor: chartColors.primary.background,
                borderColor: chartColors.primary.border,
                borderWidth: 2,
                yAxisID: 'y',
                type: viewType
            },
            {
                label: 'Toplam Yanıt',
                data: totalResponses,
                backgroundColor: chartColors.secondary.background,
                borderColor: chartColors.secondary.border,
                borderWidth: 2,
                yAxisID: 'y1',
                type: viewType
            }
        ]
    };
};

export const formatQuestionAnalysisData = (data, viewType = 'bar') => {
    if (!data || data.length === 0) {
        return { labels: [], datasets: [] };
    }

    const labels = data.map(item => item.period || item.month);
    const averageRatings = data.map(item => parseFloat((item.averageRating || 0).toFixed(2)));
    const responseCounts = data.map(item => item.responseCount || item.totalResponses || 0);

    return {
        labels,
        datasets: [
            {
                label: 'Ortalama Puan',
                data: averageRatings,
                backgroundColor: chartColors.danger.background,
                borderColor: chartColors.danger.border,
                borderWidth: 2,
                yAxisID: 'y',
                type: viewType
            },
            {
                label: 'Yanıt Sayısı',
                data: responseCounts,
                backgroundColor: chartColors.warning.background,
                borderColor: chartColors.warning.border,
                borderWidth: 2,
                yAxisID: 'y1',
                type: viewType
            }
        ]
    };
};

export const formatSentimentData = (sentimentAnalysis) => {
    if (!sentimentAnalysis) {
        return { labels: [], datasets: [] };
    }

    const sentimentLabels = {
        positive: 'Pozitif',
        negative: 'Negatif',
        neutral: 'Nötr'
    };

    const labels = Object.keys(sentimentAnalysis).map(key => sentimentLabels[key] || key);
    const data = Object.values(sentimentAnalysis);

    const backgroundColors = [
        chartColors.success.background,
        chartColors.danger.background,
        chartColors.warning.background
    ];

    return {
        labels,
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