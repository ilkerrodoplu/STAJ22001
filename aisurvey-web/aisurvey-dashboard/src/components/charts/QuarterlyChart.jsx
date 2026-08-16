import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { formatQuarterlyData, dualAxisOptions } from '../../utils/chartUtils';

const QuarterlyChart = ({ data, viewType, year }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white shadow-xl rounded-xl p-6 border">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Çeyrek Dönem Analizi</h2>
                    <p className="text-gray-600 mt-1">{year} yılı çeyrek dönemlik sonuçlar</p>
                </div>
                <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-gray-900">Veri bulunamadı</h3>
                        <p className="mt-1 text-gray-500">{year} yılı için çeyrek dönemlik veri bulunmamaktadır.</p>
                    </div>
                </div>
            </div>
        );
    }

    const chartData = formatQuarterlyData(data, viewType);
    const chartOptions = {
        ...dualAxisOptions,
        plugins: {
            ...dualAxisOptions.plugins,
            title: {
                display: true,
                text: `${year} Yılı Çeyrek Dönem Analizi`
            }
        }
    };

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 border">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Çeyrek Dönem Analizi</h2>
                <p className="text-gray-600 mt-1">{year} yılı çeyrek dönemlik sonuçlar</p>
            </div>
            <div className="h-80">
                {viewType === "bar" ? (
                    <Bar data={chartData} options={chartOptions} />
                ) : (
                    <Line data={chartData} options={chartOptions} />
                )}
            </div>
        </div>
    );
};

export default QuarterlyChart;