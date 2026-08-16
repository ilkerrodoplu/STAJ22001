
import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { BarChart2 } from 'lucide-react';

const ResponseTrendsChart = ({ data, loading }) => {
    return (
        <div className="report-card">
            <div className="card-header">
                <h2>
                    <BarChart2 size={20} />
                    <span>Yanıt Sayısı Trendi</span>
                </h2>
            </div>
            <div className="card-body" style={{ height: '300px' }}>
                {loading ? (
                    <div className="loading-indicator">
                        <div className="loading-spinner small"></div>
                    </div>
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="count"
                                name="Yanıt Sayısı"
                                stroke="#3b82f6"
                                activeDot={{ r: 8 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="avgRating"
                                name="Ortalama Puan"
                                stroke="#10b981"
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="empty-chart-message">
                        <p>Bu zaman aralığında veri bulunamadı</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResponseTrendsChart;
