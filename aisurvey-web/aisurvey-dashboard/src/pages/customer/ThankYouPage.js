
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, ThumbsUp, Share2 } from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

export default function ThankYouPage() {
    const { encodedData } = useParams();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showShareOptions, setShowShareOptions] = useState(false);

    useEffect(() => {
        const fetchCompanyInfo = async () => {
            try {
                setLoading(true);

                // Şifreli koddan Firma bilgilerini alma
                const response = await axios.get(`${API_BASE_URL}/qr-codes/survey-info/${encodedData}`);

                setCompany(response.data.company);
                setLoading(false);
            } catch (err) {
                console.error('Firma bilgisi yüklenirken hata:', err);
                setError('Firma bilgileri yüklenemedi.');
                setLoading(false);
            }
        };

        if (encodedData) {
            fetchCompanyInfo();
        }
    }, [encodedData]);

    // Yükleniyor durumu
    if (loading) {
        return (
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                <p className="text-sm text-gray-600">Lütfen bekleyin...</p>
            </div>
        );
    }

    // Hata durumu
    if (error) {
        return (
            <div className="mx-auto max-w-2xl p-4 sm:p-6">
                <div className="rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Bir hata oluştu</h2>
                    <p className="mt-2 text-sm text-red-700">{error}</p>
                </div>
            </div>
        );
    }

    // Sosyal medyada paylaşma fonksiyonu
    const handleShare = (platform) => {
        let shareUrl = '';
        const text = `${company.name} Firmaında harika bir deneyim yaşadım!`;

        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(text)}`;
                break;
            case 'whatsapp':
                shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + window.location.origin)}`;
                break;
            default:
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    };

    // Paylaşım seçeneklerini göster/gizle
    const toggleShareOptions = () => {
        setShowShareOptions(prev => !prev);
    };

    return (
        <div className="mx-auto max-w-2xl p-4 sm:p-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
                <div className="mb-4 flex justify-center text-emerald-500">
                    <CheckCircle size={64} />
                </div>

                <h1 className="text-2xl font-semibold text-gray-900">Teşekkürler!</h1>

                {company && (
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                        <strong>{company.name}</strong> deneyiminiz hakkında değerli geri bildiriminiz için teşekkür ederiz.
                        Yorumlarınız bizim için çok değerli ve hizmet kalitemizi artırmamıza yardımcı olacak.
                    </p>
                )}

                <div className="my-6 border-t border-gray-200"></div>

                <div>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                        <ThumbsUp size={20} />
                        <span>Deneyiminizi paylaşmak ister misiniz?</span>
                    </div>

                    <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
                        onClick={toggleShareOptions}
                    >
                        <Share2 size={20} />
                        <span>Deneyimimi Paylaş</span>
                    </button>

                    {showShareOptions && (
                        <div className="mt-4">
                            <div className="flex flex-wrap justify-center gap-2">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500"
                                    onClick={() => handleShare('twitter')}
                                    aria-label="Twitter'da paylaş"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                    </svg>
                                    <span>Twitter</span>
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-600"
                                    onClick={() => handleShare('facebook')}
                                    aria-label="Facebook'ta paylaş"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                    <span>Facebook</span>
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-md bg-green-700 px-3 py-2 text-sm text-white hover:bg-green-600"
                                    onClick={() => handleShare('whatsapp')}
                                    aria-label="WhatsApp'ta paylaş"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22.5c-1.952 0-3.842-.499-5.51-1.449l-4.074 1.068 1.092-3.988A10.453 10.453 0 012.25 12C2.25 6.684 6.684 2.25 12 2.25S21.75 6.684 21.75 12 17.316 21.75 12 21.75z" />
                                    </svg>
                                    <span>WhatsApp</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {company && (
                    <div className="mt-6 space-y-1 border-t border-gray-200 pt-6 text-sm text-gray-600">
                        <div><strong>Firma:</strong> {company.name}</div>

                        {company.address && (
                            <div><strong>Adres:</strong> {company.address}</div>
                        )}

                        {company.phone && (
                            <div><strong>Telefon:</strong> {company.phone}</div>
                        )}
                    </div>
                )}

                <p className="mt-6 text-sm text-gray-500">Tekrar ziyaretinizi bekleriz!</p>
            </div>
        </div>
    );
}
