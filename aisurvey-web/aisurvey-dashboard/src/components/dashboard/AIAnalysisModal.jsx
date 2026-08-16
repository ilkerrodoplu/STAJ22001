import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { aiAnalysisService } from '../../services/aiAnalysisService';

const AIAnalysisModal = ({ isOpen, onClose, commentData }) => {
    const [analysis, setAnalysis] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [typingAnimation, setTypingAnimation] = useState('');

    useEffect(() => {
        if (isOpen && commentData) {
            performAnalysis();
            // Body scroll'u engelle
            document.body.style.overflow = 'hidden';
        } else {
            setAnalysis('');
            setTypingAnimation('');
            setError(null);
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, commentData]);

    // ESC tuşu ile kapatma
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            return () => document.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen]);

const performAnalysis = async () => {
    setLoading(true);
    setError(null);
    setAnalysis('');
    setTypingAnimation('');

    try {
        const result = await aiAnalysisService.analyzeComment({
            category: 'İşletme',
            ...commentData
        });

        simulateTyping(result);

    } catch (err) {
        console.error('Analysis Error:', err);
        setError(err.message || 'Analiz sırasında bir hata oluştu.');
        setLoading(false);
    }
};

    const simulateTyping = (text) => {
        let index = 0;
        const typingSpeed = 30;

        const typeWriter = () => {
            if (index < text.length) {
                setTypingAnimation(prev => prev + text.charAt(index));
                index++;
                setTimeout(typeWriter, typingSpeed);
            } else {
                setAnalysis(text);
                setLoading(false);
            }
        };

        typeWriter();
    };

    const handleRetry = () => {
        performAnalysis();
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    const modalStyles = `
        .ai-modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 999999 !important;
            background: rgba(0, 0, 0, 0.8) !important;
            backdrop-filter: blur(4px) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 16px !important;
            animation: modalFadeIn 0.3s ease-out !important;
        }
        
        .ai-modal-container {
            position: relative !important;
            background: white !important;
            border-radius: 16px !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
            width: 100% !important;
            max-width: 700px !important;
            max-height: 90vh !important;
            display: flex !important;
            flex-direction: column !important;
            z-index: 9999999 !important;
            animation: modalSlideIn 0.3s ease-out !important;
        }
        
        .ai-modal-content {
            flex: 1 !important;
            overflow-y: auto !important;
            max-height: calc(90vh - 140px) !important;
        }
        
        @keyframes modalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
            from { 
                opacity: 0;
                transform: scale(0.9) translateY(-50px);
            }
            to { 
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
        }
        
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
    `;

    return createPortal(
        <>
            <style>{modalStyles}</style>
            <div
                className="ai-modal-overlay"
                onClick={handleBackdropClick}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div
                    className="ai-modal-container"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                        color: 'white',
                        padding: '24px',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '32px', marginRight: '12px' }}>🤖</span>
                            <div>
                                <h2 id="modal-title" style={{
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    margin: 0,
                                    marginBottom: '4px'
                                }}>
                                    AI Yorum Analizi
                                </h2>
                                <p style={{
                                    color: '#BFDBFE',
                                    fontSize: '14px',
                                    margin: 0
                                }}>
                                    Yapay zeka destekli öngörü ve öneriler
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'white',
                                fontSize: '20px',
                                transition: 'all 0.2s',
                                flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                                e.target.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                                e.target.style.transform = 'scale(1)';
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Content */}
                    <div className="ai-modal-content">
                        {/* Comment Info */}
                        <div style={{
                            padding: '24px',
                            background: 'linear-gradient(135deg, #F9FAFB 0%, #EBF8FF 100%)',
                            borderBottom: '1px solid #E5E7EB'
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '16px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: '#3B82F6',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '18px'
                                    }}>
                                        {(commentData?.name || 'M').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            color: '#6B7280',
                                            marginBottom: '4px'
                                        }}>
                                            Müşteri
                                        </div>
                                        <div style={{
                                            fontWeight: '600',
                                            color: '#111827',
                                            fontSize: '16px'
                                        }}>
                                            {commentData?.name || 'Müşteri'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px',
                                        background: commentData?.sentiment === 'positive' ? '#DCFCE7' : '#FEE2E2'
                                    }}>
                                        {commentData?.sentiment === 'positive' ? '😊' : '😔'}
                                    </div>
                                    <div>
                                        <div style={{
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            color: '#6B7280',
                                            marginBottom: '4px'
                                        }}>
                                            Duygu Durumu
                                        </div>
                                        <span style={{
                                            padding: '4px 12px',
                                            fontSize: '12px',
                                            borderRadius: '20px',
                                            fontWeight: '600',
                                            background: commentData?.sentiment === 'positive' ? '#DCFCE7' : '#FEE2E2',
                                            color: commentData?.sentiment === 'positive' ? '#166534' : '#991B1B'
                                        }}>
                                            {commentData?.sentiment === 'positive' ? 'Pozitif' : 'Negatif'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#6B7280',
                                    marginBottom: '8px'
                                }}>
                                    Müşteri Yorumu
                                </div>
                                <div style={{
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '2px dashed #D1D5DB',
                                    fontStyle: 'italic',
                                    color: '#374151',
                                    lineHeight: '1.6'
                                }}>
                                    "{commentData?.comment || 'Yorum bulunmuyor'}"
                                </div>
                            </div>
                        </div>

                        {/* Analysis Content */}
                        <div style={{ padding: '24px', minHeight: '300px' }}>
                            {loading && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#3B82F6' }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            border: '3px solid #3B82F6',
                                            borderTop: '3px solid transparent',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }}></div>
                                        <span style={{ fontSize: '16px', fontWeight: '600' }}>AI analiz yapıyor...</span>
                                    </div>

                                    <div style={{
                                        background: 'linear-gradient(135deg, #EBF8FF 0%, #F3E8FF 100%)',
                                        borderRadius: '12px',
                                        padding: '24px',
                                        border: '1px solid #93C5FD'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '20px'
                                            }}>
                                                🤖
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>AI Asistanı</div>
                                                <div style={{ fontSize: '12px', color: '#6B7280' }}>Analiz ediliyor...</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                                                {[0, 1, 2].map((i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            background: '#3B82F6',
                                                            borderRadius: '50%',
                                                            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
                                                        }}
                                                    ></div>
                                                ))}
                                            </div>
                                        </div>

                                        {typingAnimation && (
                                            <div style={{
                                                color: '#374151',
                                                lineHeight: '1.6',
                                                fontSize: '15px',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {typingAnimation}
                                                <span style={{ animation: 'blink 1s infinite', color: '#3B82F6' }}>|</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
                                    <h3 style={{
                                        fontSize: '20px',
                                        fontWeight: '600',
                                        color: '#DC2626',
                                        marginBottom: '8px'
                                    }}>
                                        Analiz Hatası
                                    </h3>
                                    <p style={{ color: '#EF4444', marginBottom: '24px', fontSize: '14px' }}>
                                        {error}
                                    </p>
                                    <button
                                        onClick={handleRetry}
                                        style={{
                                            background: '#DC2626',
                                            color: 'white',
                                            padding: '12px 24px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#B91C1C'}
                                        onMouseLeave={(e) => e.target.style.background = '#DC2626'}
                                    >
                                        🔄 Tekrar Dene
                                    </button>
                                </div>
                            )}

                            {analysis && !loading && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669' }}>
                                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span style={{ fontSize: '16px', fontWeight: '600' }}>Analiz tamamlandı</span>
                                    </div>

                                    <div style={{
                                        background: 'linear-gradient(135deg, #EBF8FF 0%, #F3E8FF 100%)',
                                        borderRadius: '12px',
                                        padding: '24px',
                                        border: '2px solid #93C5FD'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '20px'
                                            }}>
                                                🤖
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>AI Asistanı</div>
                                                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                                    {new Date().toLocaleTimeString('tr-TR')} • Analiz Tamamlandı
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{
                                            color: '#374151',
                                            lineHeight: '1.7',
                                            fontSize: '15px',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {analysis}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: '16px',
                                        borderTop: '1px solid #E5E7EB'
                                    }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(analysis);
                                                    alert('Analiz kopyalandı!');
                                                }}
                                                style={{
                                                    background: '#EBF8FF',
                                                    color: '#1D4ED8',
                                                    border: '1px solid #93C5FD',
                                                    padding: '8px 16px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = '#DBEAFE'}
                                                onMouseLeave={(e) => e.target.style.background = '#EBF8FF'}
                                            >
                                                📋 Kopyala
                                            </button>
                                            <button
                                                onClick={handleRetry}
                                                style={{
                                                    background: '#F3F4F6',
                                                    color: '#374151',
                                                    border: '1px solid #D1D5DB',
                                                    padding: '8px 16px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = '#E5E7EB'}
                                                onMouseLeave={(e) => e.target.style.background = '#F3F4F6'}
                                            >
                                                🔄 Yeniden Analiz
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                            ⚡ AI tarafından üretilmiştir
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        background: '#F9FAFB',
                        padding: '16px 24px',
                        borderBottomLeftRadius: '16px',
                        borderBottomRightRadius: '16px',
                        borderTop: '1px solid #E5E7EB',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexShrink: 0
                    }}>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                            Bu analiz yapay zeka tarafından üretilmiştir ve önerileri referans amaçlıdır.
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: '#4B5563',
                                color: 'white',
                                padding: '10px 20px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#374151'}
                            onMouseLeave={(e) => e.target.style.background = '#4B5563'}
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body // Direkt body'ye render et
    );
};

export default AIAnalysisModal;