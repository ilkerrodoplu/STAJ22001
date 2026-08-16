import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import {
    Download,
    Share2,
    Copy,
    Check,
    AlertTriangle,
    ChevronDown,
    RefreshCw
} from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1`;

// QR kodu ve link müşteriye gider: adres backend'in (REACT_APP_API_URL) değil,
// anket sayfasını sunan uygulamanın adresi olmalı. Backend'de /survey/join diye
// bir uç yok, o yüzden karekod 404 veriyordu.
// Ayrı bir alan adı varsa REACT_APP_PUBLIC_URL ile verilir; verilmezse sayfanın
// kendi adresi kullanılır, böylece localhost ve canlı ortam ek ayar istemez.
const PUBLIC_BASE_URL = (process.env.REACT_APP_PUBLIC_URL || window.location.origin).replace(/\/+$/, '');
const SURVEY_BASE_URL = `${PUBLIC_BASE_URL}/survey/join`;

// Masa bazlı QR yalnızca restoran/kafelerde anlamlı.
const RESTAURANT_CAFE = 'RESTAURANT_CAFE';

export default function SurveyQRCodeGenerator() {
    const [surveyTemplates, setSurveyTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [qrCodeSize, setQrCodeSize] = useState(256);
    const [companies, setCompanies] = useState([]);
    const [tableCount, setTableCount] = useState(10);
    // Firma logosu QR'ın ortasına gömülür; data URI'ye çevrilmiş hâli tutulur.
    const [logoDataUrl, setLogoDataUrl] = useState(null);
    const downloadLinkRef = useRef(null);
    const canvasRef = useRef(null);

    // QRCodeSVG'ye ref ataması (forwardRef uyumlu)
    const qrSvgRef = useRef(null);
    // Masa QR kodları: masa numarası -> svg elemanı
    const tableSvgRefs = useRef({});

    const selectedCompany = companies.find(c => c.id === selectedTemplate?.companyId);
    const isRestaurantCafe = selectedCompany?.companyType === RESTAURANT_CAFE;
    const tableNumbers = Array.from({ length: tableCount }, (_, i) => String(i + 1));

    useEffect(() => {
        fetchSurveyTemplates();
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (selectedTemplate) {
            generateQRCodeUrl(selectedTemplate.id);
        }
    }, [selectedTemplate]);

    /**
     * Firma profilinde logo adresi verilmişse QR kodların ortasına o logo konur.
     * Adres doğrudan kullanılamaz: indirme sırasında SVG canvas'a çizilirken dış
     * adresteki görsel yüklenmez ve logo PNG'de kaybolur. Bu yüzden logo önce
     * data URI'ye çevrilir. Okunamazsa (404/CORS) QR logosuz üretilir.
     */
    useEffect(() => {
        const logoUrl = selectedCompany?.logoUrl;
        if (!logoUrl) {
            setLogoDataUrl(null);
            return;
        }

        let cancelled = false;
        fetch(logoUrl)
            .then(res => (res.ok ? res.blob() : Promise.reject(new Error(`HTTP ${res.status}`))))
            .then(blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }))
            .then(dataUrl => { if (!cancelled) setLogoDataUrl(dataUrl); })
            .catch(err => {
                if (!cancelled) setLogoDataUrl(null);
                console.warn('Logo QR koda eklenemedi:', logoUrl, err.message);
            });

        return () => { cancelled = true; };
    }, [selectedCompany?.logoUrl]);

    /**
     * QR'ın ortasındaki logo alanı. excavate: logonun altındaki kareler boşaltılır,
     * "H" hata düzeltme seviyesiyle birlikte kod okunur kalır.
     */
    const logoSettings = (size) => (logoDataUrl ? {
        src: logoDataUrl,
        height: Math.round(size * 0.22),
        width: Math.round(size * 0.22),
        excavate: true
    } : undefined);

    const fetchCompanies = async () => {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/company`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCompanies(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Şirketler yüklenemedi:', err);
            setCompanies([]);
        }
    };

    const tableQrUrl = (tableNumber) =>
        `${SURVEY_BASE_URL}/${selectedTemplate.id}?company=${selectedCompany.id}&table=${tableNumber}`;

    const fetchSurveyTemplates = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('authToken');

            const response = await axios.get(`${API_BASE_URL}/survey-templates`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setSurveyTemplates(response.data);

            if (response.data.length > 0) {
                setSelectedTemplate(response.data[0]);
            }

            setLoading(false);
        } catch (err) {
            console.error('Anketler yüklenirken hata:', err);
            setError('Anketler yüklenemedi. Lütfen tekrar deneyin.');
            setLoading(false);
        }
    };

    const generateQRCodeUrl = (templateId) => {
        const url = `${SURVEY_BASE_URL}/${templateId}`;
        setQrCodeUrl(url);
        generateQRCode(url);
    };

    const generateQRCode = (url) => {
        // QRCodeSVG bileşeni doğrudan render edileceği için bu fonksiyon artık boş olabilir
        // veya ek özelleştirmeler için kullanılabilir
    };

    const handleTemplateChange = (e) => {
        const selectedId = e.target.value;
        const template = surveyTemplates.find(t => t.id === selectedId);
        setSelectedTemplate(template);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(qrCodeUrl);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('URL kopyalanırken hata:', err);
            // Fallback için geçici input oluştur
            const textArea = document.createElement('textarea');
            textArea.value = qrCodeUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    const handleDownloadQRCode = () => downloadQrSvg(
        qrSvgRef.current,
        `QR-Kod-${selectedTemplate.name.replace(/\s+/g, '-')}.png`
    );

    // Masaların QR kodları tek tek indirilir; tarayıcı çoklu indirmeyi sıraya alır.
    const handleDownloadAllTables = () => {
        tableNumbers.forEach((tableNumber, index) => {
            setTimeout(() => downloadQrSvg(
                tableSvgRefs.current[tableNumber],
                `QR-Masa-${tableNumber}-${selectedTemplate.name.replace(/\s+/g, '-')}.png`
            ), index * 300);
        });
    };

    const downloadQrSvg = (svgElement, fileName) => {
        if (!svgElement) return;
        try {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = qrCodeSize;
                canvas.height = qrCodeSize;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, qrCodeSize, qrCodeSize);
                const pngUrl = canvas.toDataURL('image/png');
                if (downloadLinkRef.current) {
                    downloadLinkRef.current.href = pngUrl;
                    downloadLinkRef.current.download = fileName;
                    downloadLinkRef.current.click();
                }
                URL.revokeObjectURL(url);
            };
            img.onerror = () => {
                alert('QR kod indirilemedi. Lütfen tekrar deneyin.');
                URL.revokeObjectURL(url);
            };
            img.src = url;
        } catch (err) {
            alert('QR kod indirilirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
    };

    const handleShareQRCode = async () => {
        if (!canvasRef.current) return;

        try {
            const canvas = canvasRef.current;
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

            const fileName = `QR-Kod-${selectedTemplate.name.replace(/\s+/g, '-')}.png`;

            if (navigator.share) {
                const shareData = {
                    title: `${selectedTemplate.name} - Anket QR Kodu`,
                    text: 'Anket QR kodu - Lütfen telefonunuzla tarayın',
                    url: qrCodeUrl
                };

                // Dosya paylaşımını da dene
                try {
                    shareData.files = [new File([blob], fileName, { type: 'image/png' })];
                    await navigator.share(shareData);
                } catch (fileShareErr) {
                    // Dosya paylaşımı desteklenmiyorsa sadece URL paylaş
                    delete shareData.files;
                    await navigator.share(shareData);
                }
            } else {
                // Web Share API desteklenmiyorsa manual paylaşım seçenekleri göster
                alert('Paylaşım özelliği bu tarayıcıda desteklenmiyor. URL\'yi kopyalayabilirsiniz.');
            }
        } catch (err) {
            console.error('Paylaşım hatası:', err);
            alert('Paylaşım başarısız oldu. URL\'yi kopyalamayı deneyin.');
        }
    };

    const handleSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        setQrCodeSize(newSize);
        if (qrCodeUrl) {
            generateQRCode(qrCodeUrl);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="animate-spin w-8 h-8 mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600">Anketler yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                        <h1 className="text-2xl font-bold text-white">Anket QR Kod Oluşturucu</h1>
                        <p className="text-blue-100 mt-1">Anket yanıtlama linkine QR kod oluşturun ve paylaşın</p>
                    </div>

                    {error && (
                        <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-red-800">{error}</p>
                            </div>
                            <button
                                onClick={fetchSurveyTemplates}
                                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm font-medium transition-colors"
                            >
                                Tekrar Dene
                            </button>
                        </div>
                    )}
                    {/* Kullanım Talimatları */}
                    {selectedTemplate && (
                        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Kullanım Talimatları</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Download className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h3 className="font-medium text-gray-900 mb-2">1. QR Kodu İndirin</h3>
                                    <p className="text-sm text-gray-600">
                                        QR kodunu PNG formatında indirin ve yazdırın.
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Share2 className="w-6 h-6 text-green-600" />
                                    </div>
                                    <h3 className="font-medium text-gray-900 mb-2">2. Müşterilerle Paylaşın</h3>
                                    <p className="text-sm text-gray-600">
                                        QR kodu masalara, vitrinine veya sosyal medyada paylaşın.
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Check className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <h3 className="font-medium text-gray-900 mb-2">3. Yanıtları Toplayın</h3>
                                    <p className="text-sm text-gray-600">
                                        Müşteriler QR kodu tarayarak anketi doldurabilir.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Sol Panel - Ayarlar */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Anket Seçin
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedTemplate?.id || ''}
                                            onChange={handleTemplateChange}
                                            className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
                                            disabled={surveyTemplates.length === 0}
                                        >
                                            {surveyTemplates.length === 0 ? (
                                                <option value="">Anket bulunamadı</option>
                                            ) : (
                                                surveyTemplates.map(template => (
                                                    <option key={template.id} value={template.id}>
                                                        {template.name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {selectedTemplate && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-medium text-gray-900 mb-2">Seçilen Anket Detayları</h3>
                                        <p className="text-sm text-gray-600 mb-2">
                                            <strong>Adı:</strong> {selectedTemplate.name}
                                        </p>
                                        <p className="text-sm text-gray-600 mb-2">
                                            <strong>Açıklama:</strong> {selectedTemplate.description}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <strong>Soru Sayısı:</strong> {selectedTemplate.questions?.length || 0}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        QR Kod Boyutu
                                    </label>
                                    <div className="flex items-center space-x-4">
                                        <input
                                            type="range"
                                            min="128"
                                            max="512"
                                            step="32"
                                            value={qrCodeSize}
                                            onChange={handleSizeChange}
                                            className="flex-1"
                                        />
                                        <span className="text-sm text-gray-600 font-medium">
                                            {qrCodeSize}px
                                        </span>
                                    </div>
                                </div>

                                {qrCodeUrl && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Anket Linki
                                        </label>
                                        <div className="flex">
                                            <input
                                                type="text"
                                                value={qrCodeUrl}
                                                readOnly
                                                className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                                            />
                                            <button
                                                onClick={handleCopyLink}
                                                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg transition-colors flex items-center"
                                                title="Linki Kopyala"
                                            >
                                                {copySuccess ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                        {copySuccess && (
                                            <p className="text-green-600 text-sm mt-2 flex items-center">
                                                <Check className="w-4 h-4 mr-1" />
                                                Link kopyalandı!
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Sağ Panel - QR Kod Önizleme */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">QR Kod Önizleme</h3>

                                    {qrCodeUrl ? (
                                        <div className="text-center">
                                            <div
                                                className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm"
                                            >
                                                <QRCodeSVG
                                                    ref={el => qrSvgRef.current = el}
                                                    value={qrCodeUrl}
                                                    size={qrCodeSize}
                                                    level="H"
                                                    imageSettings={logoSettings(qrCodeSize)}
                                                />
                                            </div>

                                            <div className="mt-4 text-sm text-gray-600">
                                                <p className="font-medium">{selectedTemplate?.name}</p>
                                                <p>QR kodu telefonunuzla tarayarak ankete katılın</p>
                                                {/* Sessiz kalmasın: logo verilmiş ama okunamadıysa sebebi görünsün. */}
                                                {selectedCompany?.logoUrl && !logoDataUrl && (
                                                    <p className="mt-2 text-amber-700">
                                                        Logo adresi okunamadığı için QR logosuz üretildi
                                                        (adres yanlış olabilir ya da görsel dış erişime kapalı olabilir).
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                                                <div className="w-16 h-16 bg-gray-200 rounded"></div>
                                            </div>
                                            <p>QR kod oluşturmak için anket seçin</p>
                                        </div>
                                    )}
                                </div>

                                {qrCodeUrl && (
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={handleDownloadQRCode}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>QR Kodu İndir</span>
                                        </button>

                                        <button
                                            onClick={handleShareQRCode}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <Share2 className="w-4 h-4" />
                                            <span>Paylaş</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Masa bazlı QR kodları - yalnızca restoran/kafe şirketlerinde */}
                {isRestaurantCafe && selectedTemplate && (
                    <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-lg font-medium text-gray-900">Masa QR Kodları</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Her masa için ayrı QR kod. Yanıtlar masa numarasıyla birlikte kaydedilir.
                                </p>
                            </div>
                            <div className="flex items-end gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Masa Sayısı</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="200"
                                        value={tableCount}
                                        onChange={e => setTableCount(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))}
                                        className="w-28 p-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <button
                                    onClick={handleDownloadAllTables}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Tümünü İndir</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {tableNumbers.map(tableNumber => (
                                <div key={tableNumber} className="border border-gray-200 rounded-lg p-3 text-center">
                                    <QRCodeSVG
                                        ref={el => { tableSvgRefs.current[tableNumber] = el; }}
                                        value={tableQrUrl(tableNumber)}
                                        size={140}
                                        level="H"
                                        includeMargin={true}
                                        imageSettings={logoSettings(140)}
                                    />
                                    <p className="font-medium text-gray-900 mt-2">Masa {tableNumber}</p>
                                    <button
                                        onClick={() => downloadQrSvg(
                                            tableSvgRefs.current[tableNumber],
                                            `QR-Masa-${tableNumber}-${selectedTemplate.name.replace(/\s+/g, '-')}.png`
                                        )}
                                        className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                                    >
                                        İndir
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Masa başı özet artık Anket Raporları sayfasında. */}

            </div>

            {/* Gizli İndirme Linki */}
            <a
                ref={downloadLinkRef}
                style={{ display: 'none' }}
                href="#"
                download
            >
                Download
            </a>
        </div>
    );
}
