import React from 'react';
import PaketCard from '../../components/PaketCard';
import Hero from '../../components/Hero';
import HowItWorks from '../../components/HowItWorks';
import CTASection from '../../components/CTASection';

const packages = [
    {
        id: 'Basic',
        name: 'Basic Paket',
        desc: '3 anket oluşturma • 10 soru/anket • Rapor Ekranları • CSV raporlar',
        price: '0 TL (ÜCRETSİZ)',
        features: [
            'Deneme: 1 ay ücretsiz',
            '3 Anket oluşturma',
            'Rapor Ekranları ',
            'Star (1-5 derecelendirme) ve Metin Cevapları',
        ],
    },
    {
        id: 'Plus',
        name: 'Plus Paket',
        desc: '5 anket kapasitesi • 20 soru/anket  • Rapor Ekranları • CSV raporlar • Gelişmiş AI öngürüleri',
        price: '499 TL',
        features: [
            'Deneme: 1 ay ücretsiz',
            '5 anket oluşturma',
            'Rapor ekranları ve entegrasyonlar',
            'Gelişmiş AI öngürüleri'
        ],
    },
    {
        id: 'Pro',
        name: 'Pro AI Paket',
        desc: 'Sınırsız Anket • AI Yorum Analizi   • Gelişmiş AI Öngürüleri  • Haftalık AI Stratejileri',
        price: '999 TL',
        features: [
            'Deneme: 1 ay ücretsiz',
            'Sınırsız Anket / Soru',
            'Gerçek Zamanlı Analiz & Entegrasyonlar',
            'Gelişmiş AI öngürüleri'
        ],
    },
];
const PlansPage = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <Hero />
            <HowItWorks />
            <section id="paketler" className="py-12">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-3xl font-bold mb-6">Paketler</h2>
                    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
                        {packages.map(p => (
                            <PaketCard key={p.id} p={p} />
                        ))}
                    </div>
                </div>
            </section>

            <CTASection />
            <footer id="iletisim" className="py-8 bg-gray-800 text-white">
                <div className="max-w-7xl mx-auto px-4">
                    İletişim: <a href="/admin/messages" className="underline">Destek Mesajları</a>
                </div>
            </footer>
        </div>
    );
};

export default PlansPage;