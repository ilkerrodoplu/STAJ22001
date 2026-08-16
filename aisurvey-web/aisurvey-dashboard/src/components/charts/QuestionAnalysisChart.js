import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { formatQuestionAnalysisData, dualAxisOptions } from '../../utils/chartUtils';

const QuestionAnalysisChart = ({
                                   availableQuestions,
                                   selectedQuestion,
                                   onQuestionChange,
                                   questionAnalysis,
                                   viewType,
                                   loading
                               }) => {
    if (!availableQuestions || availableQuestions.length === 0) {
        return null;
    }

    const chartData = formatQuestionAnalysisData(questionAnalysis, viewType);
    const chartOptions = {
        ...dualAxisOptions,
        plugins: {
            ...dualAxisOptions.plugins,
            title: {
                display: true,
                text: 'Soru Bazlı Aylık Analiz'
            }
        }
    };

    return (
        <div className="bg-white shadow-xl rounded-xl p-6 border">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Detaylı Soru Analizi</h2>
                <p className="text-gray-600 mt-1">Belirli bir soruya ait aylık analiz</p>
            </div>

            <div className="mb-6">
                <label htmlFor="question-select" className="block text-sm font-semibold text-gray-700 mb-2">
                    Analiz Edilecek Soruyu Seçin
                </label>
                <select
                    id="question-select"
                    value={selectedQuestion}
                    onChange={onQuestionChange}
                    className="block w-full md:w-3/4 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-3 px-4 text-sm border"
                    disabled={loading}
                >
                    <option value="">Soru seçin...</option>
                    {Array.from(availableQuestions).map((question, index) => (
                        <option key={index} value={question}>
                            {question.length > 80 ? question.substring(0, 77) + '...' : question}
                        </option>
                    ))}
                </select>
            </div>

            {selectedQuestion && questionAnalysis && questionAnalysis.length > 0 ? (
                <div className="h-96">
                    {viewType === "bar" ? (
                        <Bar data={chartData} options={chartOptions} />
                    ) : (
                        <Line data={chartData} options={chartOptions} />
                    )}
                </div>
            ) : selectedQuestion ? (
                <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-gray-900">Analiz bekleniyor</h3>
                        <p className="mt-1 text-gray-500">Seçilen soru için veri analizi yapılıyor...</p>
                    </div>
                </div>
            ) : (
                <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-gray-900">Soru seçin</h3>
                        <p className="mt-1 text-gray-500">Analiz edilecek soruyu yukarıdan seçiniz</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionAnalysisChart;