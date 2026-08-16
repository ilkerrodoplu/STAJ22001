import React from 'react';

const Hero = () => {
    const handleEnroll = () => {
        // Tam sayfa yönlendirme
        window.location.href = '/auth/register';
    };
    return (
        <section className="py-16 bg-gradient-to-br from-blue-50 to-white text-center">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
                    AI Anket Analiz ile Anketleriniz Daha Kolay
                </h1>
                <p className="text-gray-700 mb-6">
                    1 ay ücretsiz deneme, ardından düşük ücretli aylık abonelik modeli. Minimum paketler ile esnek kullanım.
                </p>
                <div className="flex justify-center gap-4">
                    <a href="/admin/survey-templates/new" className="bg-white border border-blue-600 text-blue-600 px-6 py-3 rounded-md">
                        Anket Oluştur
                    </a>
                    <a href="/auth/register" className="bg-white border border-blue-600 text-blue-600 px-6 py-3 rounded-md">
                        Şimdi Ücretsiz Deneyin
                    </a>
                    <a href="#paketler" className="bg-white border border-blue-600 text-blue-600 px-6 py-3 rounded-md">Paketleri İncele</a>
                </div>
            </div>
        </section>
    );
};

export default Hero;