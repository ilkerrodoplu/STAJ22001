
import React from 'react';
import { Star } from 'lucide-react';

const TopQuestionsTable = ({ data, loading }) => {
    return (
        <div className="report-card">
            <div className="card-header">
                <h2>
                    <Star size={20} />
                    <span>En İyi / En Kötü Sorular</span>
                </h2>
            </div>
            <div className="card-body">
                {loading ? (
                    <div className="loading-indicator">
                        <div className="loading-spinner small"></div>
                    </div>
                ) : data.length > 0 ? (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>Soru</th>
                                <th>Firma</th>
                                <th>Ortalama Puan</th>
                                <th>Yanıt Sayısı</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.map((question, index) => (
                                <tr
                                    key={index}
                                    className={index < 3 ? 'top-item' : index >= data.length - 3 ? 'bottom-item' : ''}
                                >
                                    <td>{question.text}</td>
                                    <td>{question.companyName}</td>
                                    <td>
                                        <div className="rating-display">
                                            <Star size={16} className="rating-star-icon" />
                                            <span className={
                                                question.avgRating >= 4 ? 'rating-high' :
                                                    question.avgRating >= 3 ? 'rating-medium' :
                                                        'rating-low'
                                            }>
                          {question.avgRating.toFixed(1)}
                        </span>
                                        </div>
                                    </td>
                                    <td>{question.responseCount}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-table-message">
                        <p>Bu zaman aralığında veri bulunamadı</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopQuestionsTable;
