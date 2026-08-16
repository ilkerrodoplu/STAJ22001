
import React from 'react';
import { Link } from 'react-router-dom';
import { Star, BarChart2 } from 'lucide-react';

const TopCompanyTable = ({ data, loading }) => {
    if (!data || data.length === 0) {
        return null; // Veri yoksa veya tek bir Firma seçiliyse gösterme
    }

    return (
        <div className="report-card full-width">
            <div className="card-header">
                <h2>
                    <BarChart2 size={20} />
                    <span>Firma Performansları</span>
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
                                <th>Firma</th>
                                <th>Ortalama Puan</th>
                                <th>Yanıt Sayısı</th>
                                <th>En Yüksek Puanlı Soru</th>
                                <th>En Düşük Puanlı Soru</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.map((company, index) => (
                                <tr key={company.id} className={index < 3 ? 'top-item' : ''}>
                                    <td>
                                        <Link to={`/admin/company/${company.id}`} className="company-name-link">
                                            {company.name}
                                        </Link>
                                    </td>
                                    <td>
                                        <div className="rating-display">
                                            <Star size={16} className="rating-star-icon" />
                                            <span className={
                                                company.avgRating >= 4 ? 'rating-high' :
                                                    company.avgRating >= 3 ? 'rating-medium' :
                                                        'rating-low'
                                            }>
                          {company.avgRating.toFixed(1)}
                        </span>
                                        </div>
                                    </td>
                                    <td>{company.responseCount}</td>
                                    <td>
                                        {company.bestQuestion ? (
                                            <div className="best-question">
                                                <div className="question-text">{company.bestQuestion.text}</div>
                                                <div className="question-rating">
                                                    <Star size={14} className="rating-star-icon" />
                                                    <span className="rating-high">{company.bestQuestion.avgRating.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="no-data">-</span>
                                        )}
                                    </td>
                                    <td>
                                        {company.worstQuestion ? (
                                            <div className="worst-question">
                                                <div className="question-text">{company.worstQuestion.text}</div>
                                                <div className="question-rating">
                                                    <Star size={14} className="rating-star-icon" />
                                                    <span className="rating-low">{company.worstQuestion.avgRating.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="no-data">-</span>
                                        )}
                                    </td>
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

export default TopCompanyTable;
