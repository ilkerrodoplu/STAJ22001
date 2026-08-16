import React from 'react';
import { Pie } from 'react-chartjs-2';
import { formatSentimentData, pieChartOptions } from '../../utils/chartUtils';

const SentimentChart = ({ surveySummary }) => {
    if (!surveySummary || !surveySummary.sentimentAnalysis) {
        return null;
    }

    const chartData = formatSentimentData(surveySummary.sentimentAnalysis);

    // Toplam sayıyı hesapla
    const totalSentiments = Object.values(surveySummary.sentimentAnalysis).reduce((a, b) => a + b, 0);

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 border">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Duygu Analizi</h2>
                <p className="text-gray-600 mt-1">Yanıtların duygu dağılımı (Toplam: {totalSentiments.toLocaleString()})</p>
            </div>
            <div className="h-80">
                <Pie data={chartData} options={pieChartOptions} />
            </div>

            {/* Duygu istatistikleri */}
            <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                        {surveySummary.sentimentAnalysis.positive || 0}
                    </div>
                    <div className="text-sm text-green-600">Pozitif</div>
                    <div className="text-xs text-gray-500">
                        {totalSentiments > 0 ? ((surveySummary.sentimentAnalysis.positive || 0) / totalSentiments * 100).toFixed(1) : 0}%
                    </div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-bold text-red-600">
                        {surveySummary.sentimentAnalysis.negative || 0}
                    </div>
                    <div className="text-sm text-red-600">Negatif</div>
                    <div className="text-xs text-gray-500">
                        {totalSentiments > 0 ? ((surveySummary.sentimentAnalysis.negative || 0) / totalSentiments * 100).toFixed(1) : 0}%
                    </div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-lg font-bold text-yellow-600">
                        {surveySummary.sentimentAnalysis.neutral || 0}
                    </div>
                    <div className="text-sm text-yellow-600">Nötr</div>
                    <div className="text-xs text-gray-500">
                        {totalSentiments > 0 ? ((surveySummary.sentimentAnalysis.neutral || 0) / totalSentiments * 100).toFixed(1) : 0}%
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SentimentChart;