import React from 'react';

const NotificationCard = ({
                              notification,
                              onClick,
                              onMarkAsRead,
                              onDelete
                          }) => {
    const formatFullDate = (dateString) => {
        return new Date(dateString).toLocaleString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSentimentIcon = (sentiment) => {
        return sentiment === 'positive' ? '😊' : '😔';
    };

    const getSentimentBadge = (sentiment) => {
        return sentiment === 'positive'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800';
    };

    const getSentimentText = (sentiment) => {
        return sentiment === 'positive' ? 'Pozitif' : 'Negatif';
    };

    return (
        <div
            className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                !notification.read ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={onClick}
        >
            <div className="p-6">
                <div className="flex items-start justify-between">
                    {/* Content */}
                    <div className="flex items-start space-x-4 flex-1">
                        {/* Sentiment Icon */}
                        <div className="text-3xl flex-shrink-0">
                            {getSentimentIcon(notification.sentiment)}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                            {/* Header Row */}
                            <div className="flex items-center space-x-3 mb-2 flex-wrap">
                                <h3 className={`text-base ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                    {notification.message}
                                </h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentBadge(notification.sentiment)}`}>
                  {getSentimentText(notification.sentiment)}
                </span>
                                {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                )}
                            </div>

                            {/* Customer Info */}
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3 flex-wrap">
                <span className="flex items-center">
                  <span className="mr-1">👤</span>
                    {notification.customerName || 'Müşteri'}
                </span>
                                <span className="flex items-center">
                  <span className="mr-1">📅</span>
                                    {formatFullDate(notification.createdAt)}
                </span>
                                {notification.sentimentScore && (
                                    <span className="flex items-center">
                    <span className="mr-1">📊</span>
                    Skor: {(notification.sentimentScore * 100).toFixed(0)}%
                  </span>
                                )}
                            </div>

                            {/* Comment */}
                            {notification.comment && (
                                <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-gray-300">
                                    <p className="text-sm text-gray-700 italic leading-relaxed">
                                        "{notification.comment}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                        {!notification.read && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMarkAsRead(notification.id);
                                }}
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                                title="Okundu olarak işaretle"
                            >
                                ✓ Okundu
                            </button>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notification.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Bildirimi sil"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationCard;