// src/components/dashboard/CommentsTable.jsx
import React, { useState, useEffect } from 'react';
import CommentsDisplay from './CommentsDisplay';
import { formatFullDate, getSentimentStyle, getSentimentText } from '../../utils/dashboardUtils';
import AIAnalysisModal from './AIAnalysisModal';
import DetailModal from '../ui/DetailModal';
import SurveyAnswers from '../ui/SurveyAnswers';

const CommentsTable = ({ companyId, title = "Son Geribildirimler", initialLimit = 5 }) => {
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [selectedComment, setSelectedComment] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Cevaplar penceresi: metin yazmayan yanıtta da verilen puanlar görülebilsin.
    const [answersOf, setAnswersOf] = useState(null);

    // API state'leri
    const [surveyTemplates, setSurveyTemplates] = useState([]);
    const [selectedSurveyId, setSelectedSurveyId] = useState('');
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalComments, setTotalComments] = useState(0);

    // Component mount olduğunda survey templates'leri ve comments'leri yükle
    useEffect(() => {
        if (companyId) {
            fetchSurveyTemplates();
            fetchComments();
        }
    }, [companyId]);

    // Selected survey, currentPage değiştiğinde comments'leri yeniden yükle
    useEffect(() => {
        if (companyId) {
            fetchComments();
        }
    }, [selectedSurveyId, currentPage, companyId]);

    const fetchSurveyTemplates = async () => {
        setTemplatesLoading(true);
        try {
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/api/v1/survey-templates?page=0&size=100&search=&companyId=${companyId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.ok) {
                const result = await response.json();
                setSurveyTemplates(result.content || result || []);
            } else {
                console.error('Survey templates yüklenemedi:', response.statusText);
                setSurveyTemplates([]);
            }
        } catch (error) {
            console.error('Survey templates fetch error:', error);
            setSurveyTemplates([]);
        } finally {
            setTemplatesLoading(false);
        }
    };

    const fetchComments = async () => {
        setLoading(true);
        setError(null);

        try {
            // 🎯 page parametresi ekle
            let apiUrl = `${process.env.REACT_APP_API_URL}/api/v1/reports/last-comments?size=${initialLimit}&page=${currentPage - 1}&companyId=${companyId}`;

            if (selectedSurveyId && selectedSurveyId !== '') {
                apiUrl += `&surveyTemplateId=${selectedSurveyId}`;
            }

            console.log('🔗 API Call:', apiUrl);

            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const result = await response.json();

                // 🎯 Pagination response'unu parse et
                const commentsData = result.content || result.data || result || [];

                // Pagination bilgilerini set et
                setTotalPages(result.totalPages || 1);
                setTotalComments(result.totalElements || result.total || commentsData.length);

                setComments(Array.isArray(commentsData) ? commentsData : []);

                console.log('✅ Comments loaded:', commentsData.length);
                console.log('📄 Pagination info:', {
                    currentPage: result.currentPage,
                    totalPages: result.totalPages,
                    totalElements: result.totalElements
                });
            } else {
                const errorText = await response.text();
                console.error('Comments yüklenemedi:', response.status, errorText);
                setError(`Comments yüklenemedi: ${response.status}`);
                setComments([]);
            }
        } catch (error) {
            console.error('Comments fetch error:', error);
            setError('Veriler yüklenirken hata oluştu');
            setComments([]);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Anket adı yanıtla birlikte değil, şablon listesiyle eşleştirilerek bulunur.
     * Eşleştirme eskiden yanıtlar gelirken yapılıyordu; şablonlar sonra geldiği
     * için satırlarda çoğunlukla "Bilinmeyen Anket" yazıyordu.
     */
    const namedComments = comments.map(comment => ({
        ...comment,
        surveyName: surveyTemplates.find(t =>
            t.id === (comment.surveyTemplateId || comment.surveyId || comment.templateId)
        )?.name || comment.surveyName || 'Bilinmeyen Anket'
    }));

    const handleSurveyChange = async (e) => {
        const newSurveyId = e.target.value;
        setSelectedSurveyId(newSurveyId);
        setCurrentPage(1);
        setExpandedRows(new Set());
        console.log('🔄 Survey filter changed:', newSurveyId || 'All surveys');
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        setExpandedRows(new Set());
    };

    const toggleRow = (index) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedRows(newExpanded);
    };

    const handleDetailClick = (item) => {
        setSelectedComment(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedComment(null);
    };

    const handleRefresh = () => {
        fetchComments();
    };

    const getSelectedSurveyName = () => {
        if (!selectedSurveyId) return null;
        const selectedTemplate = surveyTemplates.find(t => t.id === selectedSurveyId);
        return selectedTemplate?.name;
    };

    return (
        <>
            <CommentsDisplay
                // Props
                title={title}
                loading={loading}
                error={error}
                comments={namedComments}
                surveyTemplates={surveyTemplates}
                templatesLoading={templatesLoading}

                // States
                selectedSurveyId={selectedSurveyId}
                expandedRows={expandedRows}
                currentPage={currentPage}
                totalPages={totalPages}
                totalComments={totalComments}

                // Handlers
                handleSurveyChange={handleSurveyChange}
                handlePageChange={handlePageChange}
                handleRefresh={handleRefresh}
                toggleRow={toggleRow}
                handleDetailClick={handleDetailClick}
                handleAnswersClick={setAnswersOf}

                // Utils
                getSelectedSurveyName={getSelectedSurveyName}
                getSentimentStyle={getSentimentStyle}
                getSentimentText={getSentimentText}
                formatFullDate={formatFullDate}
            />

            {/* AI Analysis Modal */}
            <AIAnalysisModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                commentData={selectedComment}
            />

            {answersOf && (
                <DetailModal
                    title={`${answersOf.surveyName} · Verilen Cevaplar`}
                    rows={[
                        ['Müşteri', 'Müşteri'],
                        answersOf.tableNumber ? ['Masa', answersOf.tableNumber] : null,
                        ['Tarih', formatFullDate(answersOf.date)]
                    ]}
                    onClose={() => setAnswersOf(null)}
                >
                    <SurveyAnswers response={answersOf} />
                </DetailModal>
            )}
        </>
    );
};

export default CommentsTable;