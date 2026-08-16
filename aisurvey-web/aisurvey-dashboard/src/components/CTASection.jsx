import React from 'react';

const CTASection = () => {
    const handleEnroll = () => {
        // Tam sayfa yönlendirme
        window.location.href = '/auth/register';
    };
    return (
        <section className="py-8 bg-white">
            <div className="max-w-4xl mx-auto px-4 text-center">
                <h3 className="text-xl font-semibold mb-2">Hemen Başlayın</h3>
                <p className="mb-4 text-gray-700">Deneme süresi boyunca tüm abonelikler kapalı değildir. Şimdi deneyin.</p>

                <button  onClick={handleEnroll} className="bg-blue-600 text-white px-6 py-3 rounded-md">Deneme Başlat</button>
            </div>
        </section>
    );
};

export default CTASection;