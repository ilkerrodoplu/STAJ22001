import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Plus,
    Search as SearchIcon,
    BarChart2,
    Edit,
    Copy,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Filter,
    Calendar,
    FileText
} from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSiteAdmin, isCompanyOwner, canEditSurveys } from '../../utils/roles';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

/** Backend'deki SuperAdminService.WARNING_GRACE_DAYS ile aynı olmalı. */
const WARNING_GRACE_DAYS = 7;

/** Uyarıdan sonra kalan düzeltme süresi; süre dolduysa silme bu gece uygulanır. */
const daysLeftText = (warnedAt) => {
    const gecen = (Date.now() - new Date(warnedAt).getTime()) / 86400000;
    const kalan = Math.ceil(WARNING_GRACE_DAYS - gecen);
    return kalan > 0
        ? `${kalan} gün içinde düzeltmezseniz anket tamamen silinecek.`
        : 'Düzeltme süresi doldu, anket bu gece silinecek.';
};

/** Kırmızı üçgenin üstüne gelince görünen uyarı metni. */
const warningTooltip = (template) =>
    `Anketiniz yöneticiler tarafından şu sebeple askıya alındı: ${template.warningReason}\n`
    + `${daysLeftText(template.warnedAt)}\n`
    + 'Düzenleme yaptığınızda site yönetimine bildirim gider; onaylanınca anket yeniden yayına alınır.';

export default function SurveyTemplateList() {
    const { user, userProfile } = useAuth();
    // Şirket sahibi tek firmaya bağlıdır; "Firma" alanı yalnızca tüm firmaları
    // gören site admini için anlamlıdır.
    const roles = user?.roles || userProfile?.roles;
    const siteAdmin = isSiteAdmin(roles);
    // Sahip siler, editör oluşturur ve düzenler, paylaşan yalnızca görür.
    const owner = isCompanyOwner(roles);
    const canEdit = canEditSurveys(roles);
    const [templates, setTemplates] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCompany, setFilterCompany] = useState('');
    const [company, setCompany] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });
    const [duplicateModal, setDuplicateModal] = useState({ show: false, id: null, name: '', targetCompanyId: '' });

    useEffect(() => {
        fetchTemplates();
        if (siteAdmin) {
            fetchCompany();
        }
    }, [currentPage, pageSize, searchTerm, filterStatus, filterCompany]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await axios.get(`${API_BASE_URL}/survey-templates`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    page: currentPage - 1,
                    size: pageSize,
                    search: searchTerm,
                    status: filterStatus !== 'all' ? filterStatus : undefined,
                    companyId: filterCompany !== '' ? filterCompany : undefined
                }
            });

            if (Array.isArray(response.data)) {
                setTemplates(response.data);
                setTotalCount(response.data.length);
            } else if (response.data && response.data.content) {
                setTemplates(response.data.content);
                setTotalCount(response.data.totalElements);
            } else {
                setTemplates([]);
                setTotalCount(0);
            }

            setLoading(false);
        } catch (err) {
            console.error('Anket şablonları yüklenirken hata:', err);
            setError('Anketler yüklenemedi. Lütfen tekrar deneyin.');
            setLoading(false);
        }
    };

    const fetchCompany = async () => {
        try {
            const token = localStorage.getItem('token');

            const response = await axios.get(`${API_BASE_URL}/company`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    size: 1,
                    status: 'active'
                }
            });

            if (Array.isArray(response.data)) {
                setCompany(response.data);
            } else if (response.data && response.data) {
                setCompany(response.data);
            } else {
                setCompany([]);
            }
            setLoading(false);
        } catch (err) {
            setLoading(false);
            console.error('Firmalar yüklenirken hata:', err);
        }
    };

    const getCompanyName = (companyId) => {
        if (!company || !company.length) return 'Belirtilmemiş';
        const foundCompany = company.find((r) => r.id === companyId);
        return foundCompany ? foundCompany.name : 'Bilinmeyen Firma';
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchTemplates();
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const handleFilterChange = (e, filterType) => {
        if (filterType === 'status') {
            setFilterStatus(e.target.value);
        } else if (filterType === 'company') {
            setFilterCompany(e.target.value);
        }
        setCurrentPage(1);
    };

    const handleDeleteClick = (id, name) => {
        setDeleteModal({ show: true, id, name });
    };

    const handleDeleteConfirm = async () => {
        try {
            const token = localStorage.getItem('token');

            await axios.delete(`${API_BASE_URL}/survey-templates/${deleteModal.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTemplates((prev) => prev.filter((template) => template.id !== deleteModal.id));
            setTotalCount((prev) => Math.max(prev - 1, 0));
            setDeleteModal({ show: false, id: null, name: '' });
        } catch (err) {
            console.error('Anket şablonu silinirken hata:', err);
            setError('Anket silinemedi. Lütfen tekrar deneyin.');
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModal({ show: false, id: null, name: '' });
    };

    const handleDuplicateClick = (id, name) => {
        setDuplicateModal({
            show: true,
            id,
            name,
            targetCompanyId: templates.find((t) => t.id === id)?.companyId || ''
        });
    };

    const handleDuplicateConfirm = async () => {
        try {
            const token = localStorage.getItem('token');

            await axios.post(
                `${API_BASE_URL}/survey-templates/${duplicateModal.id}/duplicate`,
                {
                    targetCompanyId: duplicateModal.targetCompanyId,
                    newName: `Kopya - ${duplicateModal.name}`
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            fetchTemplates();
            setDuplicateModal({ show: false, id: null, name: '', targetCompanyId: '' });
        } catch (err) {
            console.error('Anket şablonu kopyalanırken hata:', err);
            setError('Anket kopyalanamadı. Lütfen tekrar deneyin.');
        }
    };

    const handleDuplicateCancel = () => {
        setDuplicateModal({ show: false, id: null, name: '', targetCompanyId: '' });
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const renderPaginationButtons = () => {
        const buttons = [];
        if (totalPages <= 0) return buttons;

        buttons.push(
            <button
                key="first"
                className={`px-3 py-2 rounded-md border text-sm ${
                    currentPage === 1
                        ? 'bg-indigo-600 text-white border-indigo-600 cursor-default'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
            >
                1
            </button>
        );

        if (currentPage > 3) {
            buttons.push(
                <span key="ellipsis1" className="px-2 text-gray-500">
          ...
        </span>
            );
        }

        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            buttons.push(
                <button
                    key={i}
                    className={`px-3 py-2 rounded-md border text-sm ${
                        currentPage === i
                            ? 'bg-indigo-600 text-white border-indigo-600 cursor-default'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                    onClick={() => handlePageChange(i)}
                >
                    {i}
                </button>
            );
        }

        if (currentPage < totalPages - 2) {
            buttons.push(
                <span key="ellipsis2" className="px-2 text-gray-500">
          ...
        </span>
            );
        }

        if (totalPages > 1) {
            buttons.push(
                <button
                    key="last"
                    className={`px-3 py-2 rounded-md border text-sm ${
                        currentPage === totalPages
                            ? 'bg-indigo-600 text-white border-indigo-600 cursor-default'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    {totalPages}
                </button>
            );
        }

        return buttons;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('tr-TR');
        } catch (e) {
            console.error('Tarih formatlanırken hata:', e);
            return '-';
        }
    };

    return (
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/dashboard"
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        title="Panele dön"
                    >
                        <ChevronLeft size={16} />
                        <span>Geri</span>
                    </Link>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Anketlerim</h1>
                </div>

                {canEdit && (
                    <Link
                        to="/admin/survey-templates/new"
                        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-white shadow hover:bg-indigo-500 transition"
                    >
                        <Plus size={16} />
                        <span>Anket Oluştur</span>
                    </Link>
                )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-200">
                    <form onSubmit={handleSearch} className="w-full sm:max-w-md">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Anket adı ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-gray-300 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <SearchIcon size={18} />
                            </div>
                            <button
                                type="submit"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                aria-label="Ara"
                            >
                                <SearchIcon size={18} />
                            </button>
                        </div>
                    </form>

                    <button
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        onClick={toggleFilters}
                    >
                        <Filter size={16} />
                        <span>Filtreler</span>
                    </button>
                </div>

                {showFilters && (
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label htmlFor="statusFilter" className="mb-1 text-sm font-medium text-gray-700">
                                    Durum
                                </label>
                                <select
                                    id="statusFilter"
                                    value={filterStatus}
                                    onChange={(e) => handleFilterChange(e, 'status')}
                                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="all">Tümü</option>
                                    <option value="ACTIVE">Aktif</option>
                                    <option value="INACTIVE">Pasif</option>
                                    <option value="DRAFT">Taslak</option>
                                </select>
                            </div>

                            {siteAdmin && (
                                <div className="flex flex-col">
                                    <label htmlFor="companyFilter" className="mb-1 text-sm font-medium text-gray-700">
                                        Firma
                                    </label>
                                    <select
                                        id="companyFilter"
                                        value={filterCompany}
                                        onChange={(e) => handleFilterChange(e, 'company')}
                                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Tümü</option>
                                        {company &&
                                            company.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-10">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                        <p className="text-sm text-gray-600">Anketler yükleniyor...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-between gap-3 p-4">
                        <p className="text-sm text-red-600">{error}</p>
                        <button
                            onClick={fetchTemplates}
                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-white text-sm hover:bg-indigo-500 transition"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Anket Adı</th>
                                    {siteAdmin && <th className="px-4 py-3 text-left font-semibold text-gray-700">Firma</th>}
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Hazırlayan</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Soru Sayısı</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Durum</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Son Güncelleme</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">İşlemler</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                {templates && templates.length > 0 ? (
                                    templates.map((template) => (
                                        <tr key={template.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <Link
                                                    to={`/survey/join/${template.id}?preview=1`}
                                                    state={{ preview: true }}
                                                    title="Demo olarak aç (yanıtlar kaydedilmez)"
                                                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
                                                >
                            <span className="text-gray-500">
                              <BarChart2 size={16} />
                            </span>
                                                    <span className="font-medium">{template.name}</span>
                                                </Link>

                                                {/* Süper admin uyarısı: anket pasife alındı, süresi dolunca silinir.
                                                    Sebep üçgenin üstüne gelince tooltip olarak görünür. */}
                                                {template.warnedAt && (
                                                    <span
                                                        title={warningTooltip(template)}
                                                        className="ml-2 inline-flex align-middle text-red-600 cursor-help"
                                                    >
                                                        <AlertTriangle size={16} />
                                                    </span>
                                                )}

                                            </td>
                                            {siteAdmin && (
                                                <td className="px-4 py-3 text-gray-700">{getCompanyName(template.companyId)}</td>
                                            )}
                                            {/* Anketi kim hazırladı: çalışan şirketten çıkarılırsa
                                                sahiplik şirket sahibine geçer ve burada da o görünür. */}
                                            <td className="px-4 py-3 text-gray-700">{template.createdByName || '-'}</td>
                                            <td className="px-4 py-3 text-gray-700">{template.questions ? template.questions.length : 0}</td>
                                            <td className="px-4 py-3">
                          <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  template.active || template.status === 'ACTIVE'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-200 text-gray-700'
                              }`}
                          >
                            {template.active || template.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                          </span>
                                                {(template.warnedAt || template.suspendedByAdmin) && (
                                                    <span
                                                        title={template.warnedAt ? warningTooltip(template) : undefined}
                                                        className="ml-1 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                                                    >
                                                        Askıda
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <Calendar size={14} className="text-gray-400" />
                                                    <span>{formatDate(template.updatedAt)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {canEdit && (
                                                        <Link
                                                            to={`/admin/survey-templates/edit/${template.id}`}
                                                            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50"
                                                            title="Düzenle"
                                                        >
                                                            <Edit size={16} />
                                                        </Link>
                                                    )}
                                                    {canEdit && (
                                                        <button
                                                            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50"
                                                            onClick={() => handleDuplicateClick(template.id, template.name)}
                                                            title="Kopyala"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                    )}
                                                    {owner && (
                                                        <button
                                                            className="inline-flex items-center justify-center rounded-md border border-red-300 bg-white p-2 text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDeleteClick(template.id, template.name)}
                                                            title="Sil"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={siteAdmin ? 7 : 6} className="px-4 py-10">
                                            <div className="flex flex-col items-center justify-center gap-3 text-center">
                                                <FileText size={32} strokeWidth={1} className="text-gray-400" />
                                                <p className="text-sm text-gray-600">Anket bulunamadı.</p>
                                                {canEdit && (
                                                    <Link
                                                        to="/admin/survey-templates/new"
                                                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-white text-sm hover:bg-indigo-500 transition"
                                                    >
                                                        Anket Oluştur
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Toplam {totalCount} anketten {(currentPage - 1) * pageSize + 1}-
                                    {Math.min(currentPage * pageSize, totalCount)} arası gösteriliyor
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        aria-label="Önceki"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>

                                    <div className="flex items-center gap-2">{renderPaginationButtons()}</div>

                                    <button
                                        className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        aria-label="Sonraki"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="10">10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                    <span className="text-sm text-gray-600">/ sayfa</span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Silme Onay Modal'ı */}
            {deleteModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
                        <div className="border-b border-gray-200 px-4 py-3">
                            <h3 className="text-base font-semibold text-gray-900">Anketi Sil</h3>
                        </div>
                        <div className="px-4 py-4 space-y-3">
                            <p className="text-sm text-gray-700">
                                <strong className="font-semibold">{deleteModal.name}</strong> adlı anketi silmek
                                istediğinize emin misiniz?
                            </p>
                            <p className="text-sm text-red-600">
                                Anket kalıcı olarak silinir, bu işlem geri alınamaz. Daha önce toplanan
                                yanıtlar ve raporlar durmaya devam eder.
                            </p>
                            <p className="text-sm text-gray-600">
                                Anketi yalnızca bir süre yayından kaldırmak istiyorsanız silmek yerine
                                düzenleme ekranından durumunu "Pasif" yapın.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
                            <button
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                onClick={handleDeleteCancel}
                            >
                                İptal
                            </button>
                            <button
                                className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                                onClick={handleDeleteConfirm}
                            >
                                Evet, Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kopyalama Modal'ı */}
            {duplicateModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
                        <div className="border-b border-gray-200 px-4 py-3">
                            <h3 className="text-base font-semibold text-gray-900">Anketi Kopyala</h3>
                        </div>
                        <div className="px-4 py-4 space-y-4">
                            <p className="text-sm text-gray-700">
                                <strong className="font-semibold">{duplicateModal.name}</strong> adlı anketin bir kopyasını
                                oluştur.
                            </p>

                            {/* Şirket sahibinde kopya her zaman kendi firmasına gider;
                                hedef seçimi yalnızca site adminine gösterilir. */}
                            {siteAdmin && (
                                <div className="flex flex-col">
                                    <label htmlFor="targetCompany" className="mb-1 text-sm font-medium text-gray-700">
                                        Hedef Firma
                                    </label>
                                    <select
                                        id="targetCompany"
                                        value={duplicateModal.targetCompanyId}
                                        onChange={(e) =>
                                            setDuplicateModal((prev) => ({ ...prev, targetCompanyId: e.target.value }))
                                        }
                                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {company &&
                                            company.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
                            <button
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                onClick={handleDuplicateCancel}
                            >
                                İptal
                            </button>
                            <button
                                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500"
                                onClick={handleDuplicateConfirm}
                            >
                                Kopyala
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}