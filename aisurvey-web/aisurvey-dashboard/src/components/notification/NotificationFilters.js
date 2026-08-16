import React from 'react';

const NotificationFilters = ({ activeFilter, onFilterChange, notifications }) => {
    const getFilterCount = (filterType) => {
        switch (filterType) {
            case 'unread':
                return notifications.filter(n => !n.read).length;
            case 'positive':
                return notifications.filter(n => n.sentiment === 'positive').length;
            case 'negative':
                return notifications.filter(n => n.sentiment === 'negative').length;
            default:
                return notifications.length;
        }
    };

    const filterOptions = [
        { key: 'all', label: 'Tümü', icon: '📋' },
        { key: 'unread', label: 'Okunmamış', icon: '🔴' },
        { key: 'positive', label: 'Pozitif', icon: '😊' },
        { key: 'negative', label: 'Negatif', icon: '😔' },
    ];

    return (
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {filterOptions.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onFilterChange(tab.key)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeFilter === tab.key
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
            {getFilterCount(tab.key)}
          </span>
                </button>
            ))}
        </div>
    );
};

export default NotificationFilters;