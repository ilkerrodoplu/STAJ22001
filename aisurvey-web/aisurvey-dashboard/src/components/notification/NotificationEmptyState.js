import React from 'react';

const NotificationEmptyState = ({ filter }) => {
    const getEmptyStateContent = () => {
        switch (filter) {
            case 'unread':
                return {
                    icon: '✅',
                    title: 'Tüm bildirimler okundu!',
                    message: 'Harika! Şu anda okunmamış bildiriminiz bulunmuyor.'
                };
            case 'positive':
                return {
                    icon: '😊',
                    title: 'Pozitif bildirim bulunamadı',
                    message: 'Henüz pozitif müşteri yorumu bildirimi almamışsınız.'
                };
            case 'negative':
                return {
                    icon: '😔',
                    title: 'Negatif bildirim bulunamadı',
                    message: 'Henüz negatif müşteri yorumu bildirimi almamışsınız.'
                };
            default:
                return {
                    icon: '🔔',
                    title: 'Henüz bildirim yok',
                    message: 'Yeni müşteri yorumları geldiğinde buradan bildirim alacaksınız.'
                };
        }
    };

    const content = getEmptyStateContent();

    return (
        <div className="text-center py-12">
            <div className="text-6xl mb-4">{content.icon}</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
                {content.title}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
                {content.message}
            </p>
        </div>
    );
};

export default NotificationEmptyState;