import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CHART_COLORS } from '../../utils/dashboardUtils';

const SentimentChart = ({ data, title = "Pozitif / Negatif Dağılımı" }) => {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl bg-white p-6 shadow-md flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <div className="w-full h-56 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <div className="text-4xl mb-2">📊</div>
                        <p>Henüz veri bulunmuyor</p>
                    </div>
                </div>
            </div>
        );
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);

    const customTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const percentage = ((data.value / total) * 100).toFixed(1);
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-sm text-gray-600">
                        Sayı: <span className="font-medium">{data.value}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                        Oran: <span className="font-medium">%{percentage}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="rounded-xl bg-white p-6 shadow-md flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <div className="text-sm text-gray-600 mb-4">
                Toplam: {total.toLocaleString()} yanıt
            </div>
            <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={74}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} %${(percent * 100).toFixed(1)}`}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Legend />
                        <Tooltip content={customTooltip} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Alt istatistikler */}
            <div className="w-full grid grid-cols-2 gap-2 mt-4">
                {data.map((item, index) => (
                    <div
                        key={item.name}
                        className="text-center p-2 rounded-lg"
                        style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}15` }}
                    >
                        <div className="text-sm font-medium" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
                            {item.name}
                        </div>
                        <div className="text-xs text-gray-600">
                            {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SentimentChart;