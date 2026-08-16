import React from 'react';

const SummaryCards = ({ surveySummary }) => {
    if (!surveySummary) return null;

    const cards = [
        {
            title: 'Toplam Yanıt',
            value: surveySummary.totalResponses || 0,
            bg: 'from-blue-500 to-blue-600',
            text: 'text-blue-100',
            icon: (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            title: 'Genel Ortalama',
            value: (surveySummary.overallAverageRating || 0).toFixed(1),
            bg: 'from-green-500 to-green-600',
            text: 'text-green-100',
            icon: (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            )
        },
        {
            title: 'Pozitif Yanıt',
            value: surveySummary.sentimentAnalysis?.positive || 0,
            bg: 'from-purple-500 to-purple-600',
            text: 'text-purple-100',
            icon: (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            )
        },
        {
            title: 'Negatif Yanıt',
            value: surveySummary.sentimentAnalysis?.negative || 0,
            bg: 'from-orange-500 to-orange-600',
            text: 'text-orange-100',
            icon: (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
            )
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card, index) => (
                <div key={index} className={`bg-gradient-to-r ${card.bg} p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform duration-200`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-3xl font-bold mb-1">{card.value.toLocaleString()}</div>
                            <div className={`${card.text} text-sm font-medium`}>{card.title}</div>
                        </div>
                        <div className={`${card.text} opacity-80`}>
                            {card.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SummaryCards;