// src/components/dashboard/CommentsDisplay.jsx
import React from 'react';

const CommentsDisplay = ({
                             title,
                             loading,
                             error,
                             comments,
                             surveyTemplates,
                             templatesLoading,
                             selectedSurveyId,
                             expandedRows,
                             currentPage,
                             totalPages,
                             totalComments,
                             handleSurveyChange,
                             handlePageChange,
                             handleRefresh,
                             toggleRow,
                             handleDetailClick,
                             handleAnswersClick,
                             getSelectedSurveyName,
                             getSentimentStyle,
                             getSentimentText,
                             formatFullDate
                         }) => {

    const truncateComment = (comment, maxLength = 60) => {
        if (!comment) return '';
        return comment.length > maxLength
            ? comment.substring(0, maxLength) + '...'
            : comment;
    };

    // 🎯 Mobile-friendly Pagination component
    const Pagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisiblePages = window.innerWidth < 640 ? 3 : 5; // Mobilde daha az sayfa göster

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className="mt-6 pt-4 border-t border-gray-200">
                {/* 📱 Mobile pagination - Daha kompakt */}
                <div className="flex flex-col space-y-3 sm:hidden">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Sayfa {currentPage} / {totalPages}</span>
                        <span>{totalComments} toplam yorum</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ⬅️
                        </button>

                        {/* Mobile'da sadece mevcut sayfa ve komşuları */}
                        {currentPage > 1 && (
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {currentPage - 1}
                            </button>
                        )}

                        <button
                            className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-300 rounded-md"
                        >
                            {currentPage}
                        </button>

                        {currentPage < totalPages && (
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {currentPage + 1}
                            </button>
                        )}

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ➡️
                        </button>
                    </div>
                    {/* Hızlı sayfa atlama - Mobile */}
                    {totalPages > 5 && (
                        <div className="flex items-center justify-center space-x-2 text-xs">
                            <button
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                                className="px-2 py-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                                İlk
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                                Son
                            </button>
                        </div>
                    )}
                </div>

                {/* 💻 Desktop pagination - Tam boyut */}
                <div className="hidden sm:flex items-center justify-center space-x-2">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Önceki
                    </button>

                    {startPage > 1 && (
                        <>
                            <button
                                onClick={() => handlePageChange(1)}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                1
                            </button>
                            {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
                        </>
                    )}

                    {pages.map(page => (
                        <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                                page === currentPage
                                    ? 'text-blue-600 bg-blue-50 border border-blue-300'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {page}
                        </button>
                    ))}

                    {endPage < totalPages && (
                        <>
                            {endPage < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
                            <button
                                onClick={() => handlePageChange(totalPages)}
                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {totalPages}
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sonraki
                    </button>
                </div>
            </div>
        );
    };

    // Loading state
    if (loading && comments.length === 0) {
        return (
            <div className="rounded-xl bg-white p-4 sm:p-6 shadow-md mx-2 sm:mx-0">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-500">Yorumlar yükleniyor...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="rounded-xl bg-white p-4 sm:p-6 shadow-md mx-2 sm:mx-0">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <div className="text-center py-12">
                    <div className="text-4xl mb-4">❌</div>
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        🔄 Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-white p-4 sm:p-6 shadow-md mx-2 sm:mx-0">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 space-y-4 sm:space-y-0">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold truncate">{title}</h3>
                        {loading && (
                            <div className="animate-spin text-blue-500 flex-shrink-0">
                                ⏳
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                        {selectedSurveyId ? (
                            <span>
                                <span
                                    className="text-blue-600 font-medium">"{getSelectedSurveyName()}"</span> anketinden {totalComments} toplam yorum
                            </span>
                        ) : (
                            <span>Tüm anketlerden toplam {totalComments} yorum</span>
                        )}
                    </p>
                    {totalPages > 1 && (
                        <p className="text-xs text-gray-500 mt-1">
                            Sayfa {currentPage} / {totalPages} - Bu sayfada {comments.length} yorum
                        </p>
                    )}
                </div>

                {/* Survey Filter Dropdown */}
                <div className="w-full sm:w-80 flex-shrink-0">
                    <label htmlFor="survey-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                        📋 Anket Filtresi
                    </label>
                    <div className="flex space-x-2">
                        <select
                            id="survey-filter"
                            value={selectedSurveyId}
                            onChange={handleSurveyChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 px-3 sm:px-4 text-sm border transition-all duration-200 min-w-0"
                            disabled={templatesLoading || loading}
                        >
                            <option value="">🔍 Tüm anketlerden yorumlar</option>
                            {surveyTemplates.map((template) => (
                                <option key={template.id} value={template.id}>
                                    📝 {template.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleRefresh}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors flex items-center flex-shrink-0"
                            disabled={loading}
                            title="Yenile"
                        >
                            🔄
                        </button>
                    </div>
                    {templatesLoading && (
                        <p className="text-xs text-blue-600 mt-1">⏳ Anketler yükleniyor...</p>
                    )}
                    {selectedSurveyId && !loading && (
                        <p className="text-xs text-green-600 mt-1">
                            ✅ {getSelectedSurveyName()} - {totalComments} yorum bulundu
                        </p>
                    )}
                </div>
            </div>

            {/* No Results Message */}
            {comments.length === 0 && !loading && (
                <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-gray-600">
                        {selectedSurveyId ? (
                            <span>
                                "<strong>{getSelectedSurveyName()}</strong>" anketinde yorum bulunamadı
                            </span>
                        ) : (
                            'Henüz yorum bulunmuyor'
                        )}
                    </p>
                    {selectedSurveyId && (
                        <p className="text-sm text-gray-500 mt-1">Farklı bir anket seçmeyi deneyin</p>
                    )}
                </div>
            )}

            {/* Desktop Table */}
            {comments.length > 0 && (
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="py-3 px-4 text-left font-medium text-gray-600">Müşteri</th>
                            <th className="py-3 px-4 text-left font-medium text-gray-600">Yorum</th>
                            <th className="py-3 px-4 text-center font-medium text-gray-600">Anket</th>
                            <th className="py-3 px-4 text-center font-medium text-gray-600">Duygu</th>
                            <th className="py-3 px-4 text-center font-medium text-gray-600">Tarih</th>
                            <th className="py-3 px-4 text-center font-medium text-gray-600">İşlem</th>
                        </tr>
                        </thead>
                        <tbody>
                        {comments.map((item, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4">
                                    <div className="flex items-center">
                                        <div
                                            className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                            <span className="text-blue-600 font-semibold text-xs">M</span>
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">Müşteri</div>
                                            {item.tableNumber && (
                                                <div className="text-xs text-gray-500">Masa {item.tableNumber}</div>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                <td className="py-3 px-4 max-w-xs">
                                    {item.comment ? (
                                        <div>
                                            <span className="block text-gray-900">
                                                {expandedRows.has(idx)
                                                    ? item.comment
                                                    : truncateComment(item.comment)
                                                }
                                            </span>
                                            {item.comment.length > 60 && (
                                                <button
                                                    onClick={() => toggleRow(idx)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs mt-1"
                                                >
                                                    {expandedRows.has(idx) ? 'Daha az' : 'Devamını oku'}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">Yorum yok</span>
                                    )}
                                </td>

                                {/* Anket adı kısaltılmaz: hangi anketin doldurulduğu
                                    24px'lik kutuda "Müşteri Mem..." diye kesiliyordu. */}
                                <td className="py-3 px-4 text-center">
                                    <span
                                        className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                                            selectedSurveyId ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'
                                        }`}
                                    >
                                        {item.surveyName}
                                    </span>
                                </td>

                                <td className="py-3 px-4 text-center">
                                    <span
                                        className={`inline-block px-2 py-1 text-xs rounded font-semibold ${getSentimentStyle(item.sentiment)}`}
                                    >
                                        {getSentimentText(item.sentiment)}
                                    </span>
                                </td>

                                <td className="py-3 px-4 text-center text-gray-600 text-xs">
                                    {formatFullDate(item.date)}
                                </td>

                                <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                        <button
                                            onClick={() => handleAnswersClick(item)}
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                                            title="Bu ankete verilen cevaplar"
                                        >
                                            <span>📋</span>
                                            <span>Cevaplar</span>
                                        </button>
                                        <button
                                            onClick={() => handleDetailClick(item)}
                                            className="bg-blue-100 hover:bg-blue-200 text-blue-600 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                                            title="AI Analizi"
                                        >
                                            <span>🤖</span>
                                            <span>Analiz</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Mobile Cards - md'den küçük ekranlar */}
            {comments.length > 0 && (
                <div className="md:hidden space-y-4">
                    {comments.map((item, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            {/* Card Header */}
                            <div
                                className="px-3 sm:px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                        <div
                                            className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-blue-600 font-semibold text-xs sm:text-sm">M</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-medium text-gray-900 text-sm">Müşteri</h4>
                                            {item.tableNumber && (
                                                <p className="text-xs text-gray-500">Masa {item.tableNumber}</p>
                                            )}
                                            <p className="text-xs text-blue-600 font-medium mt-1">
                                                📋 {item.surveyName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                                        <span
                                            className={`inline-block px-2 py-1 text-xs rounded font-semibold ${getSentimentStyle(item.sentiment)}`}
                                        >
                                            {getSentimentText(item.sentiment)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatFullDate(item.date)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-3 sm:p-4">
                                {/* Comment Section */}
                                <div className="mb-3">
                                    <label
                                        className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
                                        Yorum
                                    </label>
                                    {item.comment ? (
                                        <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
                                            <p className="text-sm text-gray-700 italic leading-relaxed break-words">
                                                "{expandedRows.has(idx) ? item.comment : truncateComment(item.comment, 100)}"
                                            </p>
                                            {item.comment.length > 100 && (
                                                <button
                                                    onClick={() => toggleRow(idx)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs mt-2 font-medium"
                                                >
                                                    {expandedRows.has(idx) ? '🔼 Daha az göster' : '🔽 Devamını oku'}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <span className="text-gray-400 italic text-sm">Yorum bulunmuyor</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <div className="text-xs text-gray-500 flex items-center min-w-0">
                                        <span>📅</span>
                                        <span className="ml-1 truncate">Müşteri Geribildirimi</span>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleAnswersClick(item)}
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1"
                                        >
                                            <span>📋</span>
                                            <span className="hidden xs:inline">Cevaplar</span>
                                        </button>
                                        <button
                                            onClick={() => handleDetailClick(item)}
                                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center space-x-1 shadow-sm"
                                        >
                                            <span>🤖</span>
                                            <span className="hidden xs:inline">AI Analiz</span>
                                            <span className="xs:hidden">AI</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 📱 Mobile-friendly Pagination */}
            <Pagination/>

            {/* Alt bilgi - Responsive */}
            {comments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div
                        className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 text-sm text-gray-600">
                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                            <span className="break-words">
                                {selectedSurveyId ? (
                                    <span>
                                        <span
                                            className="text-blue-600 font-medium">"{getSelectedSurveyName()}"</span> - {totalComments} toplam yorum
                                    </span>
                                ) : (
                                    `Toplam ${totalComments} yorum`
                                )}
                            </span>
                            <div className="flex items-center space-x-1">
                                <span>🤖</span>
                                <span className="text-blue-600 font-medium">AI Analiz Destekli</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end space-x-4">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded mr-1"></div>
                                <span
                                    className="text-xs sm:text-sm">Pozitif: {comments.filter(d => d.sentiment === 'positive').length}</span>
                            </div>
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-red-500 rounded mr-1"></div>
                                <span
                                    className="text-xs sm:text-sm">Negatif: {comments.filter(d => d.sentiment === 'negative').length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommentsDisplay;
