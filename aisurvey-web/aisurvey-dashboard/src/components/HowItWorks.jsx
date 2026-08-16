import React from 'react';
import FeatureCard from './FeatureCard';

const steps = [
    { title: 'Kayıt ve Kurulum', text: 'Hızlı entegrasyon ve kullanıcı yönetimi.' },
    { title: 'Anket Oluşturma', text: 'Soru türleri ve çoklu dil desteğiyle esneklik.' },
    { title: 'Raporlama', text: 'Görsel raporlar ve CSV dışa aktarım.' },
];

const HowItWorks = () => {
    return (
        <section id="nasil-calisir" className="py-12">
            <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-2xl font-bold mb-6">Nasıl Çalışır</h2>
                <div className="grid gap-6 md:grid-cols-3">
                    {steps.map((s, idx) => (
                        <FeatureCard key={idx} title={s.title} text={s.text} icon="🔹" />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;