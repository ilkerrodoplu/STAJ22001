import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const QuestionAveragesChart = ({ data, title = "Soru Bazında Ortalama Puanlar" }) => {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl bg-white p-6 shadow-md">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <div className="h-60 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <div className="text-4xl mb-2">📈</div>
                        <p>Henüz veri bulunmuyor</p>
                    </div>
                </div>
            </div>
        );
    }

    const customTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const value = payload[0].value;
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-gray-600">
                        Ortalama: <span className="font-medium text-blue-600">{value.toFixed(2)}</span>
                    </p>
                    <div className="flex items-center mt-1">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    className={star <= Math.round(value) ? 'text-yellow-400' : 'text-gray-300'}
                                >
                  ⭐
                </span>
                            ))}
                        </div>
                        <span className="ml-2 text-xs text-gray-500">
              ({Math.round(value)}/5)
            </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // En iyi ve en kötü skorları bul
    const maxScore = Math.max(...data.map(d => d.avg));
    const minScore = Math.min(...data.map(d => d.avg));

    return (
        <div className="rounded-xl bg-white p-6 shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                        <span className="text-gray-600">En Yüksek: {maxScore.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                        <span className="text-gray-600">En Düşük: {minScore.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                    />
                    <YAxis domain={[1, 5]} />
                    <Tooltip content={customTooltip} />
                    <Legend />
                    <Bar
                        dataKey="avg"
                        name="Ortalama"
                        radius={[8, 8, 0, 0]}
                        fill="#6366f1"
                    />
                </BarChart>
            </ResponsiveContainer>

            {/* Alt istatistikler */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="p-2 bg-blue-50 rounded">
                    <div className="text-sm font-medium text-blue-600">Ortalama</div>
                    <div className="text-lg font-bold text-blue-800">
                        {(data.reduce((sum, d) => sum + d.avg, 0) / data.length).toFixed(2)}
                    </div>
                </div>
                <div className="p-2 bg-green-50 rounded">
                    <div className="text-sm font-medium text-green-600">En Yüksek</div>
                    <div className="text-lg font-bold text-green-800">
                        {maxScore.toFixed(2)}
                    </div>
                </div>
                <div className="p-2 bg-red-50 rounded">
                    <div className="text-sm font-medium text-red-600">En Düşük</div>
                    <div className="text-lg font-bold text-red-800">
                        {minScore.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestionAveragesChart;