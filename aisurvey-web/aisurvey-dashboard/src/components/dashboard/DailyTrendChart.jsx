import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DailyTrendChart = ({ data, title = "Yanıt Zaman Serisi" }) => {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl bg-white p-6 shadow-md">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <div className="h-44 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <div className="text-4xl mb-2">📅</div>
                        <p>Henüz veri bulunmuyor</p>
                    </div>
                </div>
            </div>
        );
    }

    const totalResponses = data.reduce((sum, d) => sum + d.count, 0);
    const averageDaily = totalResponses / data.length;
    const maxDaily = Math.max(...data.map(d => d.count));

    const customTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const value = payload[0].value;
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-gray-600">
                        Yanıt: <span className="font-medium text-green-600">{value}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="rounded-xl bg-white p-6 shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                <div className="flex items-center space-x-4 text-sm">
                    <div className="text-gray-600">
                        Toplam: <span className="font-medium">{totalResponses}</span>
                    </div>
                    <div className="text-gray-600">
                        Günlük Ort.: <span className="font-medium">{averageDaily.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={170}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                    />
                    <YAxis />
                    <Tooltip content={customTooltip} />
                    <Bar
                        dataKey="count"
                        fill="#10b981"
                        name="Yanıt"
                        radius={[6, 6, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>

            {/* Alt istatistikler */}
            <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-green-50 rounded">
                    <div className="text-xs font-medium text-green-600">Toplam</div>
                    <div className="text-sm font-bold text-green-800">{totalResponses}</div>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                    <div className="text-xs font-medium text-blue-600">Günlük Ort.</div>
                    <div className="text-sm font-bold text-blue-800">{averageDaily.toFixed(1)}</div>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                    <div className="text-xs font-medium text-purple-600">En Yüksek</div>
                    <div className="text-sm font-bold text-purple-800">{maxDaily}</div>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                    <div className="text-xs font-medium text-gray-600">Gün Sayısı</div>
                    <div className="text-sm font-bold text-gray-800">{data.length}</div>
                </div>
            </div>
        </div>
    );
};

export default DailyTrendChart;