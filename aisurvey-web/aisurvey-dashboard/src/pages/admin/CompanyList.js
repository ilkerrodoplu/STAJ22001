
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Plus,
    Search,
    Star,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Filter,
    MoreVertical
} from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

export default function CompanyList() {
    const [company, setCompany] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });

    useEffect(() => {
        fetchCompany();
    }, [currentPage, pageSize, searchTerm, filterStatus]);

    const fetchCompany = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('authToken');

            const response = await axios.get(`${API_BASE_URL}/company`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    page: currentPage - 1,
                    size: pageSize,
                    search: searchTerm,
                    status: filterStatus !== 'all' ? filterStatus : undefined
                }
            });

            setCompany(response.data.content);
            setTotalCount(response.data.totalElements);
            setLoading(false);
        } catch (err) {
            console.error('Firmalar yüklenirken hata:', err);
            setError('Firmalar yüklenemedi. Lütfen tekrar deneyin.');
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1); // Arama yaparken ilk sayfaya dön
        fetchCompany();
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const handleFilterChange = (e) => {
        setFilterStatus(e.target.value);
        setCurrentPage(1); // Filtre değişince ilk sayfaya dön
    };

    const handleDeleteClick = (id, name) => {
        setDeleteModal({ show: true, id, name });
    };

    const handleDeleteConfirm = async () => {
        try {
            const token = localStorage.getItem('authToken');

            await axios.delete(`${API_BASE_URL}/company/${deleteModal.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Firmalar listesini güncelle
            setCompany(company.filter(company => company.id !== deleteModal.id));

            // Toplam sayıyı güncelle
            setTotalCount(totalCount - 1);

            // Modal'ı kapat
            setDeleteModal({ show: false, id: null, name: '' });

        } catch (err) {
            console.error('Firma silinirken hata:', err);
            setError('Firma silinemedi. Lütfen tekrar deneyin.');
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModal({ show: false, id: null, name: '' });
    };

    // Toplam sayfa sayısını hesapla
    const totalPages = Math.ceil(totalCount / pageSize);

    // Sayfa düğmelerini oluştur
    const renderPaginationButtons = () => {
        const buttons = [];

        // Her zaman ilk sayfayı göster
        buttons.push(
            <button
                key="first"
                className={`pagination-button ${currentPage === 1 ? 'active' : ''}`}
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
            >
                1
            </button>
        );

        // Eğer 2 sayfadan büyükse ve 2. sayfadan uzaksa "..." göster
        if (currentPage > 3) {
            buttons.push(<span key="ellipsis1" className="pagination-ellipsis">...</span>);
        }

        // Mevcut sayfanın etrafındaki sayfaları göster
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            buttons.push(
                <button
                    key={i}
                    className={`pagination-button ${currentPage === i ? 'active' : ''}`}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </button>
            );
        }

        // Eğer son sayfadan 2 sayfadan fazla uzaksa "..." göster
        if (currentPage < totalPages - 2) {
            buttons.push(<span key="ellipsis2" className="pagination-ellipsis">...</span>);
        }

        // Eğer birden fazla sayfa varsa, her zaman son sayfayı göster
        if (totalPages > 1) {
            buttons.push(
                <button
                    key="last"
                    className={`pagination-button ${currentPage === totalPages ? 'active' : ''}`}
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    {totalPages}
                </button>
            );
        }

        return buttons;
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Firmalar</h1>

                <Link to="/admin/company/new" className="btn btn-primary">
                    <Plus size={16} />
                    <span>Yeni Firma</span>
                </Link>
            </div>

            <div className="card">
                <div className="card-header-actions">
                    <form onSubmit={handleSearch} className="search-form">
                        <div className="search-input-container">
                            <input
                                type="text"
                                placeholder="Firma adı ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            <button type="submit" className="search-button">
                                <Search size={18} />
                            </button>
                        </div>
                    </form>

                    <button
                        className="btn btn-outline"
                        onClick={toggleFilters}
                    >
                        <Filter size={16} />
                        <span>Filtreler</span>
                    </button>
                </div>

                {showFilters && (
                    <div className="filters-container">
                        <div className="filter-group">
                            <label htmlFor="statusFilter">Durum:</label>
                            <select
                                id="statusFilter"
                                value={filterStatus}
                                onChange={handleFilterChange}
                                className="form-control"
                            >
                                <option value="all">Tümü</option>
                                <option value="active">Aktif</option>
                                <option value="inactive">Pasif</option>
                            </select>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>Firmalar yükleniyor...</p>
                    </div>
                ) : error ? (
                    <div className="error-message">
                        <p>{error}</p>
                        <button onClick={fetchCompany} className="btn btn-primary btn-sm">
                            Tekrar Dene
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th>Logo</th>
                                    <th>Firma Adı</th>
                                    <th>Adres</th>
                                    <th>Ortalama Puan</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                                </thead>
                                <tbody>
                                {company.length > 0 ? (
                                    company.map(company => (
                                        <tr key={company.id}>
                                            <td className="logo-cell">
                                                {company.logoUrl ? (
                                                    <img
                                                        src={company.logoUrl}
                                                        alt={`${company.name} logo`}
                                                        className="company-logo-thumbnail"
                                                    />
                                                ) : (
                                                    <div className="company-logo-placeholder">
                                                        {company.name.charAt(0)}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <Link to={`/admin/company/${company.id}`} className="company-name-link">
                                                    {company.name}
                                                </Link>
                                            </td>
                                            <td>{company.address}</td>
                                            <td>
                                                <div className="rating-display">
                                                    <Star size={16} className="rating-star-icon" />
                                                    <span>{company.avgRating ? company.avgRating.toFixed(1) : 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td>
                          <span className={`status-badge ${company.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                            {company.status === 'active' ? 'Aktif' : 'Pasif'}
                          </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <Link
                                                        to={`/admin/company/${company.id}/edit`}
                                                        className="btn btn-icon btn-sm"
                                                        title="Düzenle"
                                                    >
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button
                                                        className="btn btn-icon btn-sm btn-danger"
                                                        onClick={() => handleDeleteClick(company.id, company.name)}
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="empty-table-message">
                                            Firma bulunamadı.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 0 && (
                            <div className="pagination">
                                <div className="pagination-info">
                                    Toplam {totalCount} Firmadan {(currentPage - 1) * pageSize + 1}-
                                    {Math.min(currentPage * pageSize, totalCount)} arası gösteriliyor
                                </div>

                                <div className="pagination-controls">
                                    <button
                                        className="pagination-button pagination-nav"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft size={18} />
                                    </button>

                                    {renderPaginationButtons()}

                                    <button
                                        className="pagination-button pagination-nav"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                <div className="page-size-selector">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="form-control form-control-sm"
                                    >
                                        <option value="10">10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                    <span>/ sayfa</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Silme Onay Modal'ı */}
            {deleteModal.show && (
                <div className="modal-backdrop">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3>Firmaı Sil</h3>
                        </div>
                        <div className="modal-body">
                            <p><strong>{deleteModal.name}</strong> adlı Firmaı silmek istediğinize emin misiniz?</p>
                            <p className="text-danger">Bu işlem geri alınamaz ve tüm anket verileri silinecektir.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={handleDeleteCancel}>
                                İptal
                            </button>
                            <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                                Evet, Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
