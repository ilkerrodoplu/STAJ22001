
import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const RATING_COLORS = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#10b981'];

const RatingDistributionChart = ({ data, loading }) => {
    return (
        <div className="report-card">
            <div className="card-header">
                <h2>
                    <PieChartIcon size={20} />
                    <span>Derecelendirme Dağılımı</span>
                </h2>
            </div>
            <div className="card-body" style={{ height: '300px' }}>
                {loading ? (
                    <div className="loading-indicator">
                        <div className="loading-spinner small"></div>
                    </div>
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={RATING_COLORS[index % RATING_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
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

export default RatingDistributionChart;
