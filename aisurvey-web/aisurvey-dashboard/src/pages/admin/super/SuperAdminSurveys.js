import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ChevronLeft, Search as SearchIcon, AlertTriangle, ShieldCheck, PlayCircle, PauseCircle, FileText, Eye, MessageSquare } from 'lucide-react';
import DetailModal from '../../../components/ui/DetailModal';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
});

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('tr-TR') : '-');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('tr-TR') : '-');

const SENTIMENT_STYLES = {
    POSITIVE: 'bg-green-100 text-green-800',
    NEGATIVE: 'bg-red-100 text-red-800',
    NEUTRAL: 'bg-gray-100 text-gray-700'
};

/** Yanıttaki soru id'sinin anketteki karşılığı; silinen soru id'siyle gösterilir. */
const questionText = (survey, questionId) =>
    (survey.questions || []).find(question => question.id === questionId)?.text || questionId;

const daysLeft = (suspendAfter) => {
    if (!suspendAfter) return null;
    return Math.ceil((new Date(suspendAfter) - new Date()) / (1000 * 60 * 60 * 24));
};

/**
 * Süper admin: kullanıcıların hazırladığı tüm anketler. Süper admin anketi
 * düzenleyemez; uyarı gönderir ve anket o anda yayından kalkar. Şirket düzeltince
 * "onay bekliyor" durumuna geçer; onaylanmazsa pasif kalır. Uyarıdan 1 hafta
 * sonra hiç düzeltme yoksa anket otomatik silinir.
 */
export default function SuperAdminSurveys() {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [warnModal, setWarnModal] = useState({ show: false, id: null, name: '', reason: '' });
    // Anket içeriği penceresi: uyarı vermeden önce soruların görülebilmesi için.
    const [contentOf, setContentOf] = useState(null);
    // Ankete gelen cevaplar penceresi; içerik penceresindeki tuşla açılır.
    const [answersOf, setAnswersOf] = useState(null);
    const [answers, setAnswers] = useState({ loading: false, error: null, list: [] });

    const openAnswers = (survey) => {
        setAnswersOf(survey);
        setAnswers({ loading: true, error: null, list: [] });
        axios.get(`${API_BASE_URL}/admin/surveys/${survey.id}/responses`, { headers: authHeader() })
            .then(res => setAnswers({ loading: false, error: null, list: res.data || [] }))
            .catch(err => {
                console.error('Anket cevapları yüklenemedi:', err);
                setAnswers({ loading: false, error: 'Anket cevapları yüklenemedi.', list: [] });
            });
    };

    const fetchSurveys = useCallback(() => {
        setLoading(true);
        axios.get(`${API_BASE_URL}/admin/surveys`, { headers: authHeader() })
            .then(res => { setSurveys(res.data || []); setError(null); })
            .catch(err => {
                console.error('Anketler yüklenirken hata:', err);
                setError('Anketler yüklenemedi.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchSurveys(); }, [fetchSurveys]);

    const submitWarning = async () => {
        if (!warnModal.reason.trim()) {
            toast.error('Uyarı sebebi zorunludur');
            return;
        }
        try {
            const response = await axios.post(
                `${API_BASE_URL}/admin/surveys/${warnModal.id}/warn`,
                { reason: warnModal.reason.trim() },
                { headers: authHeader() }
            );
            setSurveys(prev => prev.map(s => (s.id === warnModal.id ? response.data : s)));
            toast.success('Uyarı gönderildi, anket yayından kaldırıldı');
            setWarnModal({ show: false, id: null, name: '', reason: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Uyarı gönderilemedi');
        }
    };

    /** Onay: uyarı kalkar ve anket yeniden yayına girer. */
    const approve = async (id) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/admin/surveys/${id}/clear-warning`,
                {}, { headers: authHeader() });
            setSurveys(prev => prev.map(s => (s.id === id ? response.data : s)));
            toast.success('Anket onaylandı ve yeniden yayına alındı');
        } catch {
            toast.error('Anket onaylanamadı');
        }
    };

    const term = search.trim().toLowerCase();
    const filtered = term
        ? surveys.filter(s => [s.name, s.companyName, s.ownerEmail]
            .some(field => (field || '').toLowerCase().includes(term)))
        : surveys;

    const warnedCount = surveys.filter(s => s.warnedAt).length;

    return (
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/admin/super/dashboard"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                    <ChevronLeft size={16} />
                    <span>Geri</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Tüm Anketler</h1>
                <span className="ml-auto text-sm text-gray-600">
                    {filtered.length} anket{warnedCount > 0 && ` · ${warnedCount} uyarılı`}
                </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                    <div className="relative w-full sm:max-w-md">
                        <input
                            type="text"
                            placeholder="Anket, firma veya sahip e-postası ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon size={18} />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-10">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                        <p className="text-sm text-gray-600">Anketler yükleniyor...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-between gap-3 p-4">
                        <p className="text-sm text-red-600">{error}</p>
                        <button onClick={fetchSurveys} className="rounded-md bg-indigo-600 px-3 py-2 text-white text-sm hover:bg-indigo-500">
                            Tekrar Dene
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                        <FileText size={32} strokeWidth={1} className="text-gray-400" />
                        <p className="text-sm text-gray-600">Anket bulunamadı.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Anket</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Firma</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Sahibi</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Soru</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Durum</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Güncelleme</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">İşlemler</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                            {filtered.map(survey => {
                                const remaining = daysLeft(survey.suspendAfter);
                                return (
                                    <tr key={survey.id} className={survey.warnedAt ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{survey.name}</div>
                                            {survey.warnedAt && (
                                                <div className="mt-1 text-xs text-amber-800">
                                                    <AlertTriangle size={12} className="inline mr-1" />
                                                    {survey.warningReason}
                                                    {remaining !== null && !survey.fixPending && (
                                                        <span className="ml-1 font-medium">
                                                            ({remaining > 0
                                                            ? `${remaining} gün içinde düzeltilmezse silinecek`
                                                            : 'silme sırasında'})
                                                        </span>
                                                    )}
                                                    {survey.fixPending && (
                                                        <span className="ml-1 font-medium text-indigo-700">
                                                            (düzeltme yapıldı, onayınızı bekliyor)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{survey.companyName || '-'}</td>
                                        <td className="px-4 py-3 text-gray-700">{survey.ownerEmail || '-'}</td>
                                        <td className="px-4 py-3 text-gray-700">{survey.questionCount}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                survey.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {survey.active ? 'Aktif' : 'Pasif'}
                                            </span>
                                            {(survey.warnedAt || survey.suspendedByAdmin) && (
                                                <span className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <PauseCircle size={12} />
                                                    Askıda
                                                </span>
                                            )}
                                            {survey.fixPending && (
                                                <span className="ml-1 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                    Düzeltme onay bekliyor
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{formatDate(survey.updatedAt)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setContentOf(survey)}
                                                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50"
                                                    title="Anket içeriğini gör"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {survey.warnedAt || survey.suspendedByAdmin ? (
                                                    <button
                                                        onClick={() => approve(survey.id)}
                                                        className="inline-flex items-center gap-2 rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-green-700 hover:bg-green-50"
                                                        title="Onayla: uyarı kalkar, anket yeniden yayına girer"
                                                    >
                                                        {survey.fixPending ? <ShieldCheck size={16} /> : <PlayCircle size={16} />}
                                                        <span>Onayla ve yayına al</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setWarnModal({ show: true, id: survey.id, name: survey.name, reason: '' })}
                                                        className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-white p-2 text-amber-700 hover:bg-amber-50"
                                                        title="Uygunsuz anket uyarısı gönder"
                                                    >
                                                        <AlertTriangle size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {contentOf && (
                <DetailModal
                    title={contentOf.name}
                    rows={[
                        ['Firma', contentOf.companyName],
                        ['Sahibi', contentOf.ownerEmail],
                        ['Açıklama', contentOf.description],
                        ['Soru sayısı', contentOf.questionCount]
                    ]}
                    onClose={() => setContentOf(null)}
                >
                    <button
                        onClick={() => openAnswers(contentOf)}
                        className="mb-4 inline-flex items-center gap-2 rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    >
                        <MessageSquare size={16} />
                        <span>Ankete gelen cevapları gör</span>
                    </button>

                    {(contentOf.questions || []).length === 0 ? (
                        <p className="text-sm text-gray-600">Bu ankette hiç soru yok.</p>
                    ) : (
                        <ol className="space-y-4">
                            {[...(contentOf.questions || [])]
                                .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                                .map((question, index) => (
                                    <li key={question.id || index} className="text-sm">
                                        <p className="font-medium text-gray-900">
                                            {index + 1}. {question.text}
                                            {question.required && <span className="text-red-500"> *</span>}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {question.type === 'TEXT' ? 'Serbest metin'
                                                : question.type === 'MULTIPLE_CHOICE' ? 'Çoktan seçmeli'
                                                    : 'Yıldızlı (1-5)'}
                                        </p>
                                        {question.type === 'MULTIPLE_CHOICE' && (
                                            <ul className="mt-1 list-disc pl-5 text-gray-700">
                                                {(question.options || []).map(option => (
                                                    <li key={option}>{option}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                        </ol>
                    )}
                </DetailModal>
            )}

            {answersOf && (
                <DetailModal
                    title={`${answersOf.name} - gelen cevaplar`}
                    rows={[
                        ['Firma', answersOf.companyName],
                        ['Cevap sayısı', answers.loading ? 'yükleniyor...' : answers.list.length]
                    ]}
                    onClose={() => setAnswersOf(null)}
                >
                    {answers.loading ? (
                        <p className="text-sm text-gray-600">Cevaplar yükleniyor...</p>
                    ) : answers.error ? (
                        <p className="text-sm text-red-600">{answers.error}</p>
                    ) : answers.list.length === 0 ? (
                        <p className="text-sm text-gray-600">Bu ankete henüz cevap gelmemiş.</p>
                    ) : (
                        <ul className="space-y-4">
                            {answers.list.map(response => (
                                <li key={response.id} className="rounded-md border border-gray-200 p-3 text-sm">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                        <span>{formatDateTime(response.submissionDate)}</span>
                                        {response.tableNumber && <span>· Masa {response.tableNumber}</span>}
                                        {response.sentiment && (
                                            <span className={`rounded-full px-2 py-0.5 font-medium ${
                                                SENTIMENT_STYLES[response.sentiment?.toUpperCase()] || 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {response.sentiment}
                                            </span>
                                        )}
                                    </div>

                                    {/* Yıldızlı cevaplar soru id'siyle gelir; ankettteki soru metniyle eşlenir. */}
                                    {Object.entries(response.ratings || {}).map(([questionId, value]) => (
                                        <p key={questionId} className="mt-2 text-gray-800">
                                            <span className="text-gray-600">
                                                {questionText(answersOf, questionId)}:
                                            </span>{' '}
                                            <span className="font-medium">{value}/5</span>
                                        </p>
                                    ))}

                                    {/* Çoktan seçmeli cevaplar soru metniyle gelir. */}
                                    {Object.entries(response.choices || {}).map(([question, choice]) => (
                                        <p key={question} className="mt-2 text-gray-800">
                                            <span className="text-gray-600">{question}:</span>{' '}
                                            <span className="font-medium">{choice}</span>
                                        </p>
                                    ))}

                                    {response.comment && (
                                        <p className="mt-2 whitespace-pre-wrap text-gray-800">{response.comment}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </DetailModal>
            )}

            {warnModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-900">Uygunsuz anket uyarısı</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            <strong>{warnModal.name}</strong> anketi uyarıyla birlikte hemen yayından kaldırılacak;
                            sahibine e-posta ve mesaj gidecek. Şirket düzeltme yaptığında size bildirim gelir ve
                            anket ancak sizin onayınızla yayına döner. 7 gün içinde hiç düzeltme yapılmazsa anket
                            tamamen silinir.
                        </p>
                        <textarea
                            rows={4}
                            value={warnModal.reason}
                            onChange={(e) => setWarnModal(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Uyarı sebebini yazın (anket sahibine iletilecek)"
                            className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setWarnModal({ show: false, id: null, name: '', reason: '' })}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={submitWarning}
                                className="rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
                            >
                                Uyarı Gönder
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
