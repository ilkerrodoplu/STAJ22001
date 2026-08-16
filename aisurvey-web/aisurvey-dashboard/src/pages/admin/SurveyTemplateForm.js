
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    Save,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    AlertTriangle,
    Copy,
    ArrowLeft,
    Star,
    Grid,
    List,
    Send, // Gönder butonu için
    Check, // Başarılı tamamlama için
    ThumbsUp // Teşekkür mesajı için
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isSiteAdmin } from '../../utils/roles';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;
// Oturumsuz uçlar /v1 altında değil: QR ile gelen katılımcı anketi buradan alır.
const PUBLIC_API_URL = `${process.env.REACT_APP_API_URL}/api/public`;

// Çoktan seçmeli soru için başlangıç şıkları
const defaultOptions = () => ['Seçenek 1', 'Seçenek 2'];

export default function SurveyTemplateForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userProfile } = useAuth();

    // Site admini dışındaki kullanıcılar yalnızca kendi şirketleri için şablon açar.
    const siteAdmin = isSiteAdmin(user?.roles || userProfile?.roles);
    // localStorage'daki kullanıcıda companyId yoksa profil yanıtından alınır;
    // aksi halde firma seçilemediği için hazır kalıplar da hiç istenmiyordu.
    const currentCompanyId = user?.companyId || userProfile?.companyId;

    // Path'den mod belirleme
    const isJoinMode = location.pathname.includes('/join/'); // Anket katılma modu
    const isEditMode = !!id && location.pathname.includes('/edit/');
    const isViewMode = !!id && !isJoinMode && !location.pathname.includes('/edit/');

    // Şablon listesinden gelen demo; QR ile gelen müşteri için false kalır.
    // Query string'den okunur ki sayfa yenilense de demo modu kaybolmasın.
    const isPreview = isJoinMode
        && (new URLSearchParams(location.search).get('preview') === '1' || location.state?.preview === true);

    // Form durumu
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        companyId: '',
        status: 'ACTIVE',
        questions: [
            {
                id: 'temp-1',
                text: '',
                required: true,
                type: 'RATING',
                displayOrder: 0
            }
        ]
    });

    // Anket katılma modu için cevaplar
    const [surveyResponses, setSurveyResponses] = useState([]);

    // UI durumları
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    // Katılım modunda anket açılamadığında (silinmiş, yayından kalkmış, hatalı link)
    // form yerine gösterilecek mesaj.
    const [unavailable, setUnavailable] = useState(null);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' veya 'grid'

    // Kafedeki masa bilgisi (URL'den gelecek)
    const [tableInfo, setTableInfo] = useState({
        companyId: '',
        tableNumber: ''
    });

    // Seçili firmanın türüne uygun hazır kalıplar + her firmaya açık genel kalıp
    const [readyTemplates, setReadyTemplates] = useState([]);

    // Veri yükleme
    useEffect(() => {
        // URL'den masa bilgisini alma (gerçek implementasyon için)
        if (isJoinMode) {
            // Örnek: query string'den almak istiyorsanız:
            const params = new URLSearchParams(location.search);
            const tableId = params.get('table');
            const companyId = params.get('company');

            if (tableId) {
                setTableInfo(prev => ({
                    ...prev,
                    tableNumber: tableId
                }));
            }

            if (companyId) {
                setTableInfo(prev => ({
                    ...prev,
                    companyId
                }));
            }
        }

        // Firma listesi oturum ister. QR ile gelen katılımcıda token yok; bu çağrı
        // 401 dönüp anket sayfasında "Firmalar yüklenemedi" hatası gösteriyordu.
        if (!isJoinMode) {
            fetchCompany();
        }

        if (id) {
            fetchTemplateData();
        }
    }, [id, location.search]);

    // Anket katılma modunda, anket verilerini aldıktan sonra cevapları oluştur
    useEffect(() => {
        if (isJoinMode && formData.questions && formData.questions.length > 0) {
            const initialResponses = formData.questions.map(question => ({
                questionId: question.id,
                value: question.type === 'RATING' ? 0 : ''
            }));

            setSurveyResponses(initialResponses);
        }
    }, [isJoinMode, formData.questions]);

    // Firma seçimi değiştikçe o firmanın türüne uygun hazır kalıpları getir
    useEffect(() => {
        if (isJoinMode || !formData.companyId) {
            setReadyTemplates([]);
            return;
        }

        const token = localStorage.getItem('token');
        axios
            .get(`${API_BASE_URL}/ready-survey-templates/for-company/${formData.companyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => setReadyTemplates(Array.isArray(res.data) ? res.data : []))
            .catch(err => {
                console.error('Hazır kalıplar yüklenemedi:', err);
                setReadyTemplates([]);
            });
    }, [formData.companyId, isJoinMode]);

    // Hazır kalıbı forma uygula: sorular kalıptan gelir, firma seçimi korunur
    const applyReadyTemplate = (template) => {
        setFormData(prev => ({
            ...prev,
            name: prev.name || template.name,
            description: prev.description || template.description || '',
            questions: (template.questions || [])
                .slice()
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((q, index) => ({
                    id: `temp-${Date.now()}-${index}`,
                    text: q.text,
                    required: q.required !== false,
                    type: q.type || 'RATING',
                    displayOrder: index,
                    // Çoktan seçmeli soruların şıkları da kalıptan gelir
                    options: q.options && q.options.length > 0 ? [...q.options] : undefined
                }))
        }));
    };

    // Görüntüleme modunda formu salt okunur yap
    useEffect(() => {
        if (isViewMode) {
            // Form alanlarını salt okunur yap
            const formElements = document.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select, textarea');
            formElements.forEach(el => {
                el.setAttribute('disabled', 'disabled');
            });

            // Düğmeleri gizle veya değiştir
            const buttons = document.querySelectorAll('button[type="submit"]');
            buttons.forEach(btn => {
                btn.style.display = 'none';
            });
        }
    }, [isViewMode, loading]);

    const fetchCompany = async () => {
        try {
            const token = localStorage.getItem('token');

            const response = await axios.get(`${API_BASE_URL}/company`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { status: 'ACTIVE', size: 100 }
            });

            const list = Array.isArray(response.data) ? response.data : [];

            // Firma seçimi yok: anket kullanıcının firmasına yazılır.
            // Site admininin kendi firması olmadığından listedeki ilk firmaya düşer.
            const ownCompanyId = currentCompanyId || (siteAdmin ? list[0]?.id : undefined);
            if (!isEditMode && !isJoinMode && ownCompanyId && !formData.companyId) {
                setFormData(prev => ({
                    ...prev,
                    companyId: ownCompanyId
                }));
            }
            setLoading(false)
        } catch (err) {
            setLoading(false);
            console.error('Firmalar yüklenirken hata:', err);
            setError('Firmalar yüklenemedi.');
        }
    };

    const fetchTemplateData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            var response = null;

            if (isJoinMode && isPreview) {
                // Yöneticinin kendi önizlemesi: oturumu var ve taslağını da
                // görebilmeli, o yüzden oturumlu uçtan okunur.
                response = await axios.get(`${API_BASE_URL}/survey-templates/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else if (isJoinMode) {
                // QR ile gelen katılımcının oturumu yok. /v1/survey-templates
                // oturum ister (bkz. SecurityConfig); oturumsuz uç yalnızca
                // yayındaki anketi döndürür.
                response = await axios.get(`${PUBLIC_API_URL}/survey-templates/${id}`);
            } else if (!isEditMode) {
                response = await axios.get(`${API_BASE_URL}/survey-templates`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                response = await axios.get(`${API_BASE_URL}/survey-templates/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            // Gelen verileri form formatına dönüştür
            const templateData = response.data;
            console.log("templateData", templateData);

            // Yayından kaldırılmış/askıya alınmış ankete yanıt toplanmaz. Önizlemede
            // (yöneticinin kendi denemesi) bu kontrol uygulanmaz.
            if (isJoinMode && !isPreview
                && (templateData.active === false || templateData.suspendedByAdmin === true)) {
                setUnavailable('Bu anket şu anda yayında değil.');
                setLoading(false);
                return;
            }

            // Soruları sıralama indeksine göre sırala
            console.log("templateData.questions", templateData.questions);
            const sortedQuestions = templateData.questions.sort((a, b) => a.displayOrder - b.displayOrder);

            setFormData({
                name: templateData.name,
                description: templateData.description || '',
                companyId: templateData.companyId,
                // Eski kayıtlarda status boş olabiliyor; yayındaysa Aktif sayılır.
                status: templateData.status || (templateData.active ? 'ACTIVE' : 'INACTIVE'),
                questions: sortedQuestions.length > 0 ? sortedQuestions : [
                    {
                        id: 'temp-1',
                        text: '',
                        required: true,
                        type: 'RATING',
                        displayOrder: 0
                    }
                ]
            });

            setLoading(false);
        } catch (err) {
            console.error('Şablon verileri yüklenirken hata:', err);

            // QR ile gelen katılımcıya teknik hata değil, anlaşılır bir mesaj gösterilir.
            if (isJoinMode) {
                // 410: anket var ama yayında değil (pasif ya da askıya alınmış).
                const status = err.response?.status;
                setUnavailable(status === 410
                    ? 'Bu anket şu anda yayında değil.'
                    : status === 404
                        ? 'Anket bulunamadı. Karekod eski olabilir.'
                        : 'Anket şu anda açılamıyor. Lütfen biraz sonra tekrar deneyin.');
            } else {
                setError('Anket yüklenemedi.');
            }
            setLoading(false);
        }
    };

    // Form değişiklikleri
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleQuestionChange = (index, field, value) => {
        setFormData(prev => {
            const updatedQuestions = [...prev.questions];
            updatedQuestions[index] = {
                ...updatedQuestions[index],
                [field]: value
            };
            return {
                ...prev,
                questions: updatedQuestions
            };
        });
    };

    // Tip değişince çoktan seçmeli sorulara başlangıç şıkları verilir, şıklar silinmez
    const handleQuestionTypeChange = (index, type) => {
        setFormData(prev => {
            const updatedQuestions = [...prev.questions];
            const current = updatedQuestions[index];
            updatedQuestions[index] = {
                ...current,
                type,
                options: type === 'MULTIPLE_CHOICE' && !(current.options || []).length
                    ? defaultOptions()
                    : current.options
            };
            return { ...prev, questions: updatedQuestions };
        });
    };

    const handleOptionChange = (questionIndex, optionIndex, value) => {
        setFormData(prev => {
            const updatedQuestions = [...prev.questions];
            const options = [...(updatedQuestions[questionIndex].options || [])];
            options[optionIndex] = value;
            updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], options };
            return { ...prev, questions: updatedQuestions };
        });
    };

    const addOption = (questionIndex) => {
        setFormData(prev => {
            const updatedQuestions = [...prev.questions];
            const options = [...(updatedQuestions[questionIndex].options || [])];
            options.push(`Seçenek ${options.length + 1}`);
            updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], options };
            return { ...prev, questions: updatedQuestions };
        });
    };

    const removeOption = (questionIndex, optionIndex) => {
        setFormData(prev => {
            const updatedQuestions = [...prev.questions];
            const options = [...(updatedQuestions[questionIndex].options || [])];

            if (options.length <= 2) {
                return prev; // Çoktan seçmelide en az iki şık olmalı
            }

            options.splice(optionIndex, 1);
            updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], options };
            return { ...prev, questions: updatedQuestions };
        });
    };

    // Müşteri anket cevapları için değişiklik işleyicisi
    const handleSurveyResponseChange = (index, value) => {
        setSurveyResponses(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                value: value
            };
            return updated;
        });
    };

    const addQuestion = () => {
        setFormData(prev => {
            const updatedQuestions = [...prev.questions];
            const newdisplayOrder = updatedQuestions.length > 0
                ? Math.max(...updatedQuestions.map(q => q.displayOrder)) + 1
                : 0;

            updatedQuestions.push({
                id: `temp-${Date.now()}`,
                text: '',
                required: true,
                type: 'RATING',
                displayOrder: newdisplayOrder
            });

            return {
                ...prev,
                questions: updatedQuestions
            };
        });
    };

    const removeQuestion = (index) => {
        setFormData(prev => {
            if (prev.questions.length <= 1) {
                return prev; // En az bir soru olmalı
            }

            const updatedQuestions = [...prev.questions];
            updatedQuestions.splice(index, 1);

            // Sıralama indekslerini güncelle
            updatedQuestions.forEach((q, i) => {
                q.displayOrder = i;
            });

            return {
                ...prev,
                questions: updatedQuestions
            };
        });
    };

    const moveQuestion = (index, direction) => {
        setFormData(prev => {
            const updatedQuestions = [...prev.questions];

            if (
                (direction === 'up' && index === 0) ||
                (direction === 'down' && index === updatedQuestions.length - 1)
            ) {
                return prev;
            }

            const targetIndex = direction === 'up' ? index - 1 : index + 1;

            // Sıralamada geçici değişkenle soruların yerini değiştir
            const temp = updatedQuestions[index];
            updatedQuestions[index] = updatedQuestions[targetIndex];
            updatedQuestions[targetIndex] = temp;

            // Sıralama indekslerini güncelle
            updatedQuestions.forEach((q, i) => {
                q.displayOrder = i;
            });

            return {
                ...prev,
                questions: updatedQuestions
            };
        });
    };

    const duplicateQuestion = (index) => {
        setFormData(prev => {
            const updatedQuestions = [...prev.questions];
            const questionToDuplicate = { ...updatedQuestions[index] };

            // Yeni bir ID oluştur ve sıralama indeksini güncelle
            const newQuestion = {
                ...questionToDuplicate,
                id: `temp-${Date.now()}`,
                displayOrder: questionToDuplicate.displayOrder + 1
            };

            // Yeni soruyu ekle ve sıralama indekslerini güncelle
            updatedQuestions.splice(index + 1, 0, newQuestion);

            updatedQuestions.forEach((q, i) => {
                q.displayOrder = i;
            });

            return {
                ...prev,
                questions: updatedQuestions
            };
        });
    };

    // Admin formu doğrulama
    const validateForm = () => {
        const errors = {};

        if (!formData.name.trim()) {
            errors.name = 'Anket adı gereklidir.';
        }

        if (!formData.companyId) {
            // Görünür bir firma alanı yok; firma kullanıcıdan gelir.
            errors.companyId = 'Firmanız belirlenemedi. Lütfen çıkış yapıp yeniden giriş yapın.';
        }

        const questionErrors = formData.questions.map(question => {
            const qErrors = {};

            if (!question.text.trim()) {
                qErrors.text = 'Soru metni gereklidir.';
            }

            if (question.type === 'MULTIPLE_CHOICE') {
                const options = question.options || [];
                if (options.length < 2) {
                    qErrors.options = 'En az iki şık gereklidir.';
                } else if (options.some(option => !option.trim())) {
                    qErrors.options = 'Şık metinleri boş bırakılamaz.';
                }
            }

            return qErrors;
        });

        if (questionErrors.some(qe => Object.keys(qe).length > 0)) {
            errors.questions = questionErrors;
        }

        return errors;
    };

    // Müşteri anketi doğrulama
    const validateSurveyResponse = () => {
        const errors = {};

        // Zorunlu soruları kontrol et
        formData.questions.forEach((question, index) => {
            if (question.required) {
                const response = surveyResponses[index];

                if (!response ||
                    (question.type === 'RATING' && (response.value === 0 || response.value === null)) ||
                    (question.type === 'TEXT' && (!response.value || response.value.trim() === ''))) {
                    errors[`question_${index}`] = 'Bu soru cevaplanmalıdır.';
                }
            }
        });

        return errors;
    };

    // Admin form gönderme
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitAttempted(true);

        const validationErrors = validateForm();

        if (Object.keys(validationErrors).length > 0) {
            console.log('Doğrulama hataları:', validationErrors);
            setError('Lütfen form alanlarını kontrol edin.');
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem('token');

            // API'ye gönderilecek verileri hazırla
            console.log(formData.questions)
            const dataToSubmit = {
                ...formData,
                // active alanı formda tutulmuyordu; gönderilmeyince backend onu
                // null'a çekiyor ve anket "Anketlerim" listesinden düşüyordu.
                // Tek kaynak yukarıdaki durum seçimidir.
                active: formData.status === 'ACTIVE',
                questions: formData.questions.map(q => ({
                    ...q,
                    id: q.id.startsWith('temp-') ? null : q.id // Geçici ID'leri temizle
                }))

            };

            let response;

            if (isEditMode) {
                response = await axios.put(`${API_BASE_URL}/survey-templates/${id}`, dataToSubmit, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                response = await axios.post(`${API_BASE_URL}/survey-templates`, dataToSubmit, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setSaving(false);


            // Başarılı mesajıyla birlikte liste sayfasına yönlendir
            navigate('/admin/survey-templates', {
                state: {
                    notification: {
                        type: 'success',
                        message: isEditMode
                            ? 'Anket başarıyla güncellendi.'
                            : 'Anket başarıyla oluşturuldu.'
                    }
                }
            });
        } catch (err) {
            console.error('Anket şablonu kaydedilirken hata:', err);

            let errorMessage = 'Anket kaydedilemedi.';

            if (err.response && err.response.data && err.response.data.message) {
                errorMessage = err.response.data.message;
            }

            setError(errorMessage);
            setSaving(false);
        }
    };

    // Müşteri anket yanıtı gönderme

// handleSurveySubmit fonksiyonunu MongoDB modeliyle uyumlu hale getirme

    const handleSurveySubmit = async (e) => {
        e.preventDefault();
        setSubmitAttempted(true);

        const validationErrors = validateSurveyResponse();

        if (Object.keys(validationErrors).length > 0) {
            console.log('Doğrulama hataları:', validationErrors);
            setError('Lütfen tüm zorunlu soruları cevaplayın.');

            // Sayfayı ilk hataya kaydır
            const firstErrorKey = Object.keys(validationErrors)[0];
            const firstErrorElement = document.getElementById(firstErrorKey);
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            return;
        }

        try {
            setSaving(true);

            // Yıldız derecelendirmelerini, şıkları ve serbest yorumu ayır
            const ratings = {};
            const choices = {};
            let commentText = "";

            // Cevapları uygun formata dönüştür
            surveyResponses.forEach((response, index) => {
                const question = formData.questions[index];

                // RATING tipindeki soruları ratings objesine ekle
                if (!question.type || question.type === 'RATING') {
                    ratings[question.text] = parseInt(response.value) || 0;
                }
                // TEXT tipindeki soruları comment alanına birleştir
                else if (question.type === 'TEXT') {
                    if (response.value && response.value.trim() !== "") {
                        commentText += `${response.value}\n\n`;
                    }
                }
                // Şıklar ayrı alanda tutulur: yoruma karıştırılırsa duygu analizi
                // "Tesadüfen", "Reklam" gibi nötr kategorileri olumsuz sayıyor.
                else if (question.type === 'MULTIPLE_CHOICE') {
                    if (response.value) {
                        choices[question.text] = response.value;
                    }
                }
            });

            // Anket kişisel bilgi sormaz: ad/e-posta gönderilmez. Herkese aynı
            // yer tutucu e-posta yazılması yüzünden ikinci müşteri "bu anketi
            // bugün zaten doldurdunuz" hatası alıyordu.
            const submissionData = {
                companyId: tableInfo.companyId || formData.companyId,
                surveyTemplateId: id,
                visitDate: new Date().toISOString().split('T')[0], // Bugünün tarihi
                tableNumber: tableInfo.tableNumber || null,
                ratings: ratings,
                choices: choices,
                comment: commentText.trim() || null
            };

            // Demo (şablon listesinden açılan önizleme) kaydedilmez.
            if (!isPreview) {
                await axios.post(`${API_BASE_URL}/survey-responses`, submissionData);
            }

            // Başarıyla tamamlandı
            setSubmitted(true);
            setSaving(false);
            setError(null);

            // Sayfanın en üstüne kaydır
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error('Anket yanıtı gönderilirken hata:', err);

            let errorMessage = 'Anket yanıtınız gönderilemedi. Lütfen tekrar deneyin.';

            if (err.response && err.response.data && err.response.data.message) {
                errorMessage = err.response.data.message;
            }

            setError(errorMessage);
            setSaving(false);
        }
    };


    // Yükleniyor durumu
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Veriler yükleniyor...</p>
            </div>
        );
    }

    // Anket açılamadı: karekodu okutan kişi boş form yerine açıklama görür.
    if (isJoinMode && unavailable) {
        return (
            <div className="survey-thank-you-container">
                <div className="thank-you-content">
                    <div className="success-icon">
                        <AlertTriangle size={64} color="#f59e0b" strokeWidth={2} />
                    </div>
                    <h1>Anket açılamadı</h1>
                    <p className="thank-you-message">{unavailable}</p>
                    <p className="visit-again-message">
                        Sorun sürerse lütfen işletmeye bildirin.
                    </p>
                </div>
            </div>
        );
    }

    // Anket gönderildi teşekkür sayfası
    if (isJoinMode && submitted) {
        return (
            <div className="survey-thank-you-container">
                <div className="thank-you-content">
                    <div className="success-icon">
                        <Check size={64} color="#4caf50" strokeWidth={2} />
                    </div>
                    <h1>Teşekkür Ederiz!</h1>
                    <p className="thank-you-message">
                        {isPreview
                            ? 'Bu bir demo denemesiydi; yanıtlar sisteme kaydedilmedi.'
                            : 'Değerli görüşleriniz için teşekkür ederiz. Yanıtlarınız başarıyla kaydedildi.'}
                    </p>
                    <div className="thumbs-up-container">
                        <ThumbsUp size={48} color="#2196f3" />
                    </div>
                    {isPreview ? (
                        /* Demo çıkmazda kalmasın: yönetici şablonlara dönebilsin. */
                        <div className="thank-you-actions">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => navigate('/admin/survey-templates')}
                            >
                                <ArrowLeft size={16} />
                                <span>Anketlerime Dön</span>
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => { setSubmitted(false); window.scrollTo({ top: 0 }); }}
                            >
                                Tekrar Dene
                            </button>
                        </div>
                    ) : (
                        <p className="visit-again-message">
                            Sizi tekrar ağırlamaktan mutluluk duyarız!
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Müşteri anket katılım formu
    if (isJoinMode) {
        return (
            <div className="customer-survey-container">
                {isPreview && (
                    /* Yönetimden gelen demo: müşteri görmez, yönetici geri dönebilsin. */
                    <>
                        <button
                            type="button"
                            className="btn btn-outline preview-back-btn"
                            onClick={() => navigate('/admin/survey-templates')}
                        >
                            <ArrowLeft size={16} />
                            <span>Anketlerime Dön</span>
                        </button>
                        <div className="demo-banner">
                            <AlertTriangle size={18} />
                            <span>
                                <strong>DEMO</strong> — Bu anket yalnızca önizleme amaçlıdır.
                                Doldursanız bile yanıtlar sisteme kaydedilmez.
                            </span>
                        </div>
                    </>
                )}

                <div className="survey-header">
                    <h1>{formData.name}</h1>
                    {formData.description && <p className="survey-description">{formData.description}</p>}

                    {tableInfo.tableNumber && (
                        <div className="table-info">
                            <span>Masa: {tableInfo.tableNumber}</span>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="error-message">
                        <AlertTriangle size={20} />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSurveySubmit} className="survey-form">
                    <div className="questions-section">
                        <h2>Anket Soruları</h2>

                        {formData.questions.map((question, index) => (
                            <div
                                key={question.id}
                                id={`question_${index}`}
                                className={`question-item ${submitAttempted && validateSurveyResponse()[`question_${index}`] ? 'error' : ''}`}
                            >
                                <div className="question-text">
                                    <span className="question-number">{index + 1}.</span> {question.text}
                                    {question.required && <span className="required-mark">*</span>}
                                </div>

                                {/* Varsayılan olarak RATING tipinde olarak işle (type özelliği yoksa) */}
                                {(!question.type || question.type === 'RATING') && (
                                    <div className="rating-input-container">
                                        <div className="rating-stars">
                                            {[1, 2, 3, 4, 5].map((rating) => (
                                                <button
                                                    key={rating}
                                                    type="button"
                                                    onClick={() => handleSurveyResponseChange(index, rating)}
                                                    className={`rating-star ${surveyResponses[index]?.value >= rating ? 'active' : ''}`}
                                                    aria-label={`${rating} yıldız`}
                                                >
                                                    <Star
                                                        size={36}
                                                        className="star-icon"
                                                        fill={surveyResponses[index]?.value >= rating ? "#FFC107" : "none"}
                                                        stroke={surveyResponses[index]?.value >= rating ? "#FFC107" : "#CCC"}
                                                        strokeWidth={1.5}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        {surveyResponses[index]?.value > 0 && (
                                            <div className="rating-value">{surveyResponses[index]?.value}/5</div>
                                        )}
                                    </div>
                                )}

                                {question.type === 'TEXT' && (
                                    <div className="text-input-container">
                    <textarea
                        value={surveyResponses[index]?.value || ''}
                        onChange={(e) => handleSurveyResponseChange(index, e.target.value)}
                        className="form-control"
                        placeholder="Yanıtınızı buraya yazın..."
                        rows={3}
                    />
                                    </div>
                                )}

                                {question.type === 'MULTIPLE_CHOICE' && question.options && question.options.length > 0 && (
                                    <div className="multiple-choice-container">
                                        {question.options.map((option, optionIndex) => (
                                            <div key={optionIndex} className="option-item">
                                                <input
                                                    type="radio"
                                                    id={`option-${index}-${optionIndex}`}
                                                    name={`question-${index}`}
                                                    value={option}
                                                    checked={surveyResponses[index]?.value === option}
                                                    onChange={() => handleSurveyResponseChange(index, option)}
                                                />
                                                <label htmlFor={`option-${index}-${optionIndex}`}>{option}</label>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {submitAttempted && validateSurveyResponse()[`question_${index}`] && (
                                    <div className="error-feedback">
                                        <AlertTriangle size={16} className="error-icon" />
                                        {validateSurveyResponse()[`question_${index}`]}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg btn-block submit-survey-btn"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <div className="spinner-border spinner-border-sm" role="status">
                                        <span className="sr-only">Gönderiliyor...</span>
                                    </div>
                                    <span>Gönderiliyor...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    <span>Anketi Gönder</span>
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        );
    }

    // Admin form (düzenleme veya yeni oluşturma)
    return (
        <div className="survey-template-form-page">
            <div className="page-header">
                <div className="header-content">
                    <h1 className="page-title">
                        {isEditMode ? 'Anketi Düzenle' : 'Anket Oluştur'}
                    </h1>
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => navigate('/admin/survey-templates')}
                    >
                        <ArrowLeft size={16} />
                        <span>Geri Dön</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <AlertTriangle size={20} />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="survey-form">
                <div className="form-grid">
                    <div className="form-section">
                        <div className="card">
                            <div className="card-header">
                                <h2>Anket Bilgileri</h2>
                            </div>
                            <div className="card-body">
                                <div className="form-group">
                                    <label htmlFor="name">Anket Adı *</label>
                                    <input
                                        id="name"
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className={`form-control ${submitAttempted && !formData.name.trim() ? 'is-invalid' : ''}`}
                                        placeholder="Örn: Müşteri Memnuniyet Anketi"
                                    />
                                    {submitAttempted && !formData.name.trim() && (
                                        <div className="invalid-feedback">Anket adı gereklidir.</div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="description">Açıklama</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="form-control"
                                        placeholder="Bu anket hakkında kısa bir açıklama..."
                                        rows={3}
                                    />
                                </div>

                                {/* Firma alanı yok: anket her zaman giriş yapan kullanıcının
                                    firmasına yazılır (site admininde listedeki ilk firma). */}

                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="form-control"
                                >
                                    <option value="ACTIVE">Aktif</option>
                                    <option value="INACTIVE">Pasif</option>
                                    <option value="DRAFT">Taslak</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {readyTemplates.length > 0 && (
                    <div className="form-section">
                        <div className="card">
                            <div className="card-header">
                                <h2>Hazır Kalıplar</h2>
                            </div>
                            <div className="card-body">
                                <p className="text-muted">
                                    Seçili firmanın türüne uygun kalıplar. Birini seçtiğinizde sorular
                                    otomatik doldurulur, sonrasında düzenleyebilirsiniz.
                                </p>
                                <div className="ready-template-list">
                                    {readyTemplates.map(template => (
                                        <button
                                            key={template.id}
                                            type="button"
                                            className="ready-template-card"
                                            onClick={() => applyReadyTemplate(template)}
                                        >
                                            <span className="ready-template-name">{template.name}</span>
                                            {template.description && (
                                                <span className="ready-template-desc">{template.description}</span>
                                            )}
                                            <span className="ready-template-meta">
                                                {(template.questions || []).length} soru · Kalıbı kullan
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-section">
                    <div className="card">
                        <div className="card-header">
                            <h2>Sorular</h2>
                            <div className="header-actions">
                                <div className="view-mode-toggle">
                                    <button
                                        type="button"
                                        className={`btn btn-icon ${viewMode === 'list' ? 'active' : ''}`}
                                        onClick={() => setViewMode('list')}
                                        title="Liste Görünümü"
                                    >
                                        <List size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                                        onClick={() => setViewMode('grid')}
                                        title="Kart Görünümü"
                                    >
                                        <Grid size={18} />
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={addQuestion}
                                >
                                    <Plus size={16} />
                                    <span>Soru Ekle</span>
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className={`questions-container ${viewMode}`}>
                                {formData.questions.length === 0 ? (
                                    <div className="empty-questions">
                                        <p>
                                            Henüz hiç soru eklenmemiş. Başlamak için "Soru Ekle" butonuna tıklayın.
                                        </p>
                                    </div>
                                ) : (
                                    formData.questions.map((question, index) => (
                                        <div key={question.id} className={`question-item ${viewMode}`}>
                                            <div className="question-header">
                                                <div className="question-number">Soru {index + 1}</div>
                                                <div className="question-actions">
                                                    <button
                                                        type="button"
                                                        className="btn btn-icon"
                                                        onClick={() => moveQuestion(index, 'up')}
                                                        disabled={index === 0}
                                                        title="Yukarı Taşı"
                                                    >
                                                        <ChevronUp size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-icon"
                                                        onClick={() => moveQuestion(index, 'down')}
                                                        disabled={index === formData.questions.length - 1}
                                                        title="Aşağı Taşı"
                                                    >
                                                        <ChevronDown size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-icon"
                                                        onClick={() => duplicateQuestion(index)}
                                                        title="Kopyala"
                                                    >
                                                        <Copy size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-icon btn-danger"
                                                        onClick={() => removeQuestion(index)}
                                                        disabled={formData.questions.length <= 1}
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="question-body">
                                                <div className="form-group">
                                                    <label htmlFor={`question-${index}-text`}>Soru Metni *</label>
                                                    <input
                                                        id={`question-${index}-text`}
                                                        type="text"
                                                        value={question.text}
                                                        onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                                                        className={`form-control ${submitAttempted && !question.text.trim() ? 'is-invalid' : ''}`}
                                                        placeholder="Örn: Hizmetimizden ne kadar memnun kaldınız?"
                                                    />
                                                    {submitAttempted && !question.text.trim() && (
                                                        <div className="invalid-feedback">Soru metni gereklidir.</div>
                                                    )}
                                                </div>

                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label htmlFor={`question-${index}-type`}>Soru Tipi</label>
                                                        <select
                                                            id={`question-${index}-type`}
                                                            value={question.type}
                                                            onChange={(e) => handleQuestionTypeChange(index, e.target.value)}
                                                            className="form-control"
                                                        >
                                                            <option value="RATING">Derecelendirme (1-5 yıldız)</option>
                                                            <option value="TEXT">Metin Yanıtı</option>
                                                            <option value="MULTIPLE_CHOICE">Çoktan Seçmeli</option>
                                                        </select>
                                                    </div>

                                                    <div className="form-group form-check">
                                                        <input
                                                            id={`question-${index}-required`}
                                                            type="checkbox"
                                                            checked={question.required}
                                                            onChange={(e) => handleQuestionChange(index, 'required', e.target.checked)}
                                                            className="form-check-input"
                                                        />
                                                        <label htmlFor={`question-${index}-required`} className="form-check-label">
                                                            Zorunlu soru
                                                        </label>
                                                    </div>
                                                </div>

                                                {question.type === 'RATING' && (
                                                    <div className="question-preview">
                                                        <div className="preview-label">Önizleme:</div>
                                                        <div className="rating-preview">
                                                            {[1, 2, 3, 4, 5].map(rating => (
                                                                <Star
                                                                    key={rating}
                                                                    size={24}
                                                                    className="rating-star"
                                                                    fill="#fbbf24"
                                                                    stroke="#fbbf24"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {question.type === 'MULTIPLE_CHOICE' && (
                                                    <div className="form-group">
                                                        <label>Şıklar *</label>
                                                        <div className="options-editor">
                                                            {(question.options || []).map((option, optionIndex) => (
                                                                <div key={optionIndex} className="option-row">
                                                                    <input
                                                                        type="radio"
                                                                        disabled
                                                                        name={`preview-${index}`}
                                                                        aria-hidden="true"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={option}
                                                                        onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                                                        className={`form-control ${submitAttempted && !option.trim() ? 'is-invalid' : ''}`}
                                                                        placeholder={`Seçenek ${optionIndex + 1}`}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-icon btn-danger"
                                                                        onClick={() => removeOption(index, optionIndex)}
                                                                        disabled={(question.options || []).length <= 2}
                                                                        title="Şıkkı Sil"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="btn btn-outline btn-sm"
                                                            onClick={() => addOption(index)}
                                                        >
                                                            <Plus size={14} />
                                                            <span>Şık Ekle</span>
                                                        </button>

                                                        {submitAttempted && (question.options || []).some(o => !o.trim()) && (
                                                            <div className="invalid-feedback d-block">Şık metinleri boş bırakılamaz.</div>
                                                        )}
                                                    </div>
                                                )}

                                                {question.type === 'TEXT' && (
                                                    <div className="question-preview">
                                                        <div className="preview-label">Önizleme:</div>
                                                        <div className="text-preview">
                                                                <textarea
                                                                    className="form-control preview-textarea"
                                                                    placeholder="Yanıtınızı buraya yazın..."
                                                                    disabled
                                                                    rows={2}
                                                                />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>


    <div className="form-actions">
        <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/admin/survey-templates')}
        >
            İptal
        </button>
        <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
        >
            {saving ? (
                <>
                    <div className="spinner-border spinner-border-sm" role="status">
                        <span className="sr-only">Kaydediliyor...</span>
                    </div>
                    <span>Kaydediliyor...</span>
                </>
            ) : (
                <>
                    <Save size={16} />
                    <span>{isEditMode ? 'Güncelle' : 'Kaydet'}</span>
                </>
            )}
        </button>
    </div>
</form>
</div>
);
}
