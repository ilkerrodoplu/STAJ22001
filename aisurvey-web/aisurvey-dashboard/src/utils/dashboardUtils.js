// Soru id -> başlık mapping
export const questionLabels = {
    '685ff4cebb0dc133898dfd23': 'Atmosfer',
    '685ff4cebb0dc133898dfd22': 'Temizlik',
    '685ff4cebb0dc133898dfd2b': 'Lezzet',
    '685ff4cebb0dc133898dfd25': 'Çeşitlilik',
    '685ff4cebb0dc133898dfd24': 'Fiyat/Performans',
    '685ff4cebb0dc133898dfd27': 'Personel',
    '685ff4cebb0dc133898dfd29': 'Servis Hızı',
    '685ff4cebb0dc133898dfd28': 'Sunum',
    '685ff4cebb0dc133898dfd2a': 'Tekrar Tercih',
};

// Chart renkleri
export const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

// Soru ortalamalarını formatla
export const formatQuestionAverages = (data) => {
    return Object.entries(data).map(([qid, val]) => ({
        name: questionLabels[qid] || qid,
        avg: val,
        fullName: questionLabels[qid] || `Soru ${qid.slice(-4)}`
    }));
};

// Duygu istatistiklerini formatla
export const formatSentimentStats = (data) => {
    return Object.entries(data).map(([key, value]) => ({
        name: key === 'positive' ? 'Pozitif' : 'Negatif',
        value,
        key
    }));
};

// Günlük trendi formatla
export const formatDailyTrend = (data) => {
    return Object.entries(data).map(([date, count]) => ({
        date: formatDateForChart(date),
        count,
        fullDate: date
    }));
};

// Tarihi chart için formatla
export const formatDateForChart = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit'
    });
};

// Tarihi tam formatla
export const formatFullDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Duygu tipine göre stil
export const getSentimentStyle = (sentiment) => {
    return sentiment === 'positive'
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-600';
};

// Duygu tipine göre metin
export const getSentimentText = (sentiment) => {
    return sentiment === 'positive' ? 'Pozitif' : 'Negatif';
};

// İstatistik kartı renkleri
export const getStatCardColor = (type) => {
    const colors = {
        comments: 'from-blue-400 to-blue-600',
        // Sarı zeminde beyaz yazı göz yoruyordu; aynı sıcak aile, okunur koyu ton.
        average: 'from-amber-600 to-orange-700',
        total: 'from-indigo-400 to-fuchsia-500',
        today: 'from-green-400 to-green-600'
    };
    return colors[type] || 'from-gray-400 to-gray-600';
};