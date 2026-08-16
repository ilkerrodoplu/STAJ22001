
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Star } from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

/**
 * Karekodu okutan müşterinin anketi. Kişisel bilgi sorulmaz ve aynı kişi anketi
 * istediği kadar doldurabilir: ikinci ziyaret ayrı bir deneyimdir.
 */
export default function SurveyPage() {
    const { encodedData } = useParams();
    const navigate = useNavigate();

    const [company, setCompany] = useState(null);
    const [surveyTemplate, setSurveyTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [progress, setProgress] = useState(0);

    const [formData, setFormData] = useState({
        visitDate: new Date().toISOString().split('T')[0],
        ratings: {},
        comment: '',
        companyId: undefined,
        surveyTemplateId: undefined,
    });

    // Şifreli URL'den anket bilgilerini yükleme
    const fetchSurveyInfo = useCallback(async () => {
        if (!encodedData) return;
        try {
            setLoading(true);
            setError(null);

            const response = await axios.get(`${API_BASE_URL}/qr-codes/survey-info/${encodedData}`);

            setCompany(response.data.company);
            setSurveyTemplate(response.data.surveyTemplate);

            // Soruları derecelendirme için boş obje hazırla
            const initialRatings = {};
            response.data.surveyTemplate.questions.forEach((question) => {
                initialRatings[question.id] = 0;
            });

            setFormData((prev) => ({
                ...prev,
                ratings: initialRatings,
                companyId: response.data.company.id,
                surveyTemplateId: response.data.surveyTemplate.id,
            }));

            setLoading(false);
        } catch (err) {
            console.error('Anket bilgisi yüklenirken hata:', err);
            setError('Anket bilgileri yüklenemedi. Lütfen QR kodu tekrar okutun.');
            setLoading(false);
        }
    }, [encodedData, navigate]);

    useEffect(() => {
        fetchSurveyInfo();
    }, [fetchSurveyInfo]);

    // İlerlemeyi güncelle
    useEffect(() => {
        if (surveyTemplate) {
            const totalSteps = 2;
            const progressPercentage = ((currentStep - 1) / totalSteps) * 100;
            setProgress(progressPercentage);
        }
    }, [currentStep, surveyTemplate]);

    // Input değişikliklerini işle
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Derecelendirme değişikliğini işle
    const handleRatingChange = (questionId, rating) => {
        setFormData((prev) => ({
            ...prev,
            ratings: {
                ...prev.ratings,
                [questionId]: rating,
            },
        }));
    };

    // Sonraki adıma geç
    const handleNextStep = () => {
        setCurrentStep((prev) => prev + 1);
    };

    // Önceki adıma dön
    const handlePrevStep = () => {
        setCurrentStep((prev) => prev - 1);
    };

    // Anketi gönder
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            await axios.post(`${API_BASE_URL}/survey-responses`, {
                companyId: formData.companyId,
                surveyTemplateId: formData.surveyTemplateId,
                visitDate: formData.visitDate,
                ratings: formData.ratings,
                comment: formData.comment,
            });

            navigate(`/thank-you/${encodedData}`, { replace: true });
        } catch (err) {
            console.error('Anket gönderilirken hata:', err);
            // Sunucu sebebi bildiriyorsa (aynı gün tekrar doldurma, istek sınırı)
            // genel mesajın altında kalmasın.
            setError(err.response?.data?.message
                || 'Anketi gönderirken bir hata oluştu. Lütfen tekrar deneyin.');
            setLoading(false);
        }
    };

    // Yükleniyor durumu
    if (loading && !company) {
        return (
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                <p className="text-sm text-gray-600">Anket yükleniyor...</p>
            </div>
        );
    }

    // Hata durumu
    if (error && !company) {
        return (
            <div className="mx-auto max-w-2xl p-4 sm:p-6">
                <div className="rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Bir hata oluştu</h2>
                    <p className="mt-2 text-sm text-red-700">{error}</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
                    >
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl p-4 sm:p-6">
            {company && surveyTemplate && (
                <>
                    {/* Başlık */}
                    <div className="mb-6 flex flex-col items-center text-center">
                        {company.logoUrl && (
                            <img
                                src={company.logoUrl}
                                alt={company.name}
                                className="mb-3 h-20 w-20 rounded-xl object-contain shadow-sm"
                            />
                        )}
                        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{company.name}</h1>
                        <p className="text-sm text-gray-600">{surveyTemplate.name}</p>
                    </div>

                    {/* İlerleme çubuğu */}
                    <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
                    >
                        {/* Adım 1: Değerlendirmeler */}
                        {currentStep === 1 && (
                            <div>
                                <h2 className="mb-4 text-lg font-semibold text-gray-900">Değerlendirmeleriniz</h2>

                                {surveyTemplate.questions.map((question) => (
                                    <div
                                        key={question.id}
                                        className="border-t border-gray-200 py-4 first:border-t-0 first:pt-0"
                                    >
                                        <p className="mb-2 text-sm font-medium text-gray-800">{question.text}</p>
                                        <div className="flex justify-center gap-1">
                                            {[1, 2, 3, 4, 5].map((rating) => (
                                                <button
                                                    key={rating}
                                                    type="button"
                                                    aria-label={`${rating} yıldız`}
                                                    aria-pressed={formData.ratings[question.id] === rating}
                                                    className={`rounded p-1 transition-colors ${
                                                        formData.ratings[question.id] >= rating
                                                            ? 'text-amber-500'
                                                            : 'text-gray-300 hover:text-amber-300'
                                                    }`}
                                                    onClick={() => handleRatingChange(question.id, rating)}
                                                >
                                                    <Star
                                                        size={32}
                                                        fill={formData.ratings[question.id] >= rating ? 'currentColor' : 'none'}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-1 flex justify-between text-xs text-gray-500">
                                            <span>Çok Kötü</span>
                                            <span>Mükemmel</span>
                                        </div>
                                    </div>
                                ))}

                                <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleNextStep}
                                        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
                                    >
                                        Devam Et
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Adım 2: Yorum */}
                        {currentStep === 2 && (
                            <div>
                                <h2 className="mb-4 text-lg font-semibold text-gray-900">Ek Yorumlarınız</h2>

                                <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                                    Deneyiminiz hakkında eklemek istediğiniz yorumlar
                                </label>
                                <textarea
                                    id="comment"
                                    name="comment"
                                    value={formData.comment}
                                    onChange={handleInputChange}
                                    rows="5"
                                    placeholder="Deneyiminizi bizimle paylaşın..."
                                    className="mt-2 w-full rounded-md border border-gray-300 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                ></textarea>

                                {/* Gönderim hatası (aynı gün tekrar doldurma, istek sınırı) görünsün. */}
                                {error && (
                                    <p className="mt-3 text-sm text-red-700">{error}</p>
                                )}

                                <div className="mt-6 flex justify-between border-t border-gray-200 pt-4">
                                    <button
                                        type="button"
                                        onClick={handlePrevStep}
                                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Geri
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-60"
                                    >
                                        {loading ? 'Gönderiliyor...' : 'Anketi Tamamla'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </>
            )}
        </div>
    );
}