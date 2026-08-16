
import React, { useState } from 'react';
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
import { TrendingUp, ChevronDown } from 'lucide-react';

const QuestionTrendsChart = ({ data, loading }) => {
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Veri içindeki benzersiz soruları bul
    const allQuestions = data.length > 0
        ? Array.from(new Set(data.map(item => item.questionId)))
            .map(id => {
                const questionData = data.find(item => item.questionId === id);
                return {
                    id,
                    text: questionData.questionText,
                    selected: false
                };
            })
        : [];

    const toggleQuestionSelection = (questionId) => {
        if (selectedQuestions.includes(questionId)) {
            setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
        } else {
            // Eğer 5'den az soru seçilmişse, yeni soruyu ekle
            if (selectedQuestions.length < 5) {
                setSelectedQuestions([...selectedQuestions, questionId]);
            }
        }
    };

    // Seçilen sorular için benzersiz renkler
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    // Veriyi tarih bazlı gruplandır
    const groupedData = data.reduce((acc, item) => {
        if (!selectedQuestions.includes(item.questionId)) return acc;

        const dateExists = acc.find(d => d.date === item.date);

        if (dateExists) {
            dateExists[`q_${item.questionId}`] = item.avgRating;
        } else {
            const newDateEntry = { date: item.date };
            newDateEntry[`q_${item.questionId}`] = item.avgRating;
            acc.push(newDateEntry);
        }

        return acc;
    }, []);

    // Tarih sırasına göre sırala
    groupedData.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="report-card">
            <div className="card-header">
                <h2>
                    <TrendingUp size={20} />
                    <span>Soru Trendleri</span>
                </h2>

                <div className="dropdown">
                    <button
                        className="btn btn-sm btn-outline dropdown-toggle"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                        <span>Sorular ({selectedQuestions.length}/5)</span>
                        <ChevronDown size={16} />
                    </button>

                    {dropdownOpen && (
                        <div className="dropdown-menu dropdown-menu-right dropdown-checkbox-menu">
                            <div className="dropdown-menu-header">
                                <span>Görüntülenecek soruları seçin (en fazla 5)</span>
                            </div>

                            <div className="dropdown-menu-items">
                                {allQuestions.map(question => (
                                    <div
                                        key={question.id}
                                        className="dropdown-checkbox-item"
                                        onClick={() => toggleQuestionSelection(question.id)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedQuestions.includes(question.id)}
                                            readOnly
                                        />
                                        <span className="dropdown-item-text">{question.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="card-body" style={{ height: '300px' }}>
                {loading ? (
                    <div className="loading-indicator">
                        <div className="loading-spinner small"></div>
                    </div>
                ) : data.length > 0 ? (
                    selectedQuestions.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={groupedData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis domain={[1, 5]} />
                                <Tooltip />
                                <Legend />

                                {selectedQuestions.map((questionId, index) => {
                                    const question = allQuestions.find(q => q.id === questionId);
                                    return (
                                        <Line
                                            key={questionId}
                                            type="monotone"
                                            dataKey={`q_${questionId}`}
                                            name={question ? question.text : `Soru ${index + 1}`}
                                            stroke={COLORS[index % COLORS.length]}
                                            activeDot={{ r: 8 }}
                                        />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart-message">
                            <p>Lütfen görüntülemek için en az bir soru seçin</p>
                        </div>
                    )
                ) : (
                    <div className="empty-chart-message">
                        <p>Bu zaman aralığında veri bulunamadı</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionTrendsChart;
