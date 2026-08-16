export const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Az önce';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dk önce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} sa önce`;
    return `${Math.floor(diffInSeconds / 86400)} gün önce`;
};

export const getSentimentIcon = (sentiment) => {
    return sentiment === 'positive' ? '😊' : '😔';
};

export const getSentimentColor = (sentiment) => {
    return sentiment === 'positive'
        ? 'border-l-green-400 bg-green-50'
        : 'border-l-red-400 bg-red-50';
};