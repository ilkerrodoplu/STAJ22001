
import React from 'react';
import { BellRing, RefreshCw, CheckCheck, Search } from 'lucide-react';

const NotificationHeader = ({
                                totalCount,
                                unreadCount,
                                hasUnreadNotifications,
                                onMarkAllAsRead,
                                onRefresh,
                                isRefreshing,
                                onSearch,
                                searchTerm
                            }) => {
    return (
        <div className="space-y-4">
            {/* Main Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <BellRing className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span>Toplam: {totalCount}</span>
                            {hasUnreadNotifications && (
                                <span className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span className="font-medium text-red-600">
                                        {unreadCount} Okunmamış
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    {/* Refresh Button */}
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className={`flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 
                                  text-gray-700 rounded-lg transition-colors duration-200 
                                  ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                        />
                        <span>Yenile</span>
                    </button>

                    {/* Mark All as Read Button */}
                    {hasUnreadNotifications && (
                        <button
                            onClick={onMarkAllAsRead}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                                     text-white rounded-lg transition-colors duration-200"
                        >
                            <CheckCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">Tümünü Okundu İşaretle</span>
                            <span className="sm:hidden">Tümünü İşaretle</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Bildirimlerde ara..."
                            value={searchTerm}
                            onChange={(e) => onSearch(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg 
                                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                                     placeholder-gray-400 text-sm"
                        />
                    </div>
                </div>

                {searchTerm && (
                    <button
                        onClick={() => onSearch('')}
                        className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 
                                 hover:bg-gray-100 rounded transition-colors duration-200"
                    >
                        Temizle
                    </button>
                )}
            </div>

            {/* Status Banner */}
            {hasUnreadNotifications ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <BellRing className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-800">
                                <span className="font-medium">{unreadCount} yeni bildirim</span> var.
                                Önemli müşteri geri bildirimlerini kaçırmayın!
                            </p>
                        </div>
                    </div>
                </div>
            ) : totalCount > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <CheckCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-green-800">
                                Harika! Tüm bildirimlerinizi kontrol ettiniz.
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default NotificationHeader;
