import { localSummary } from './localSummary';

// AI agent'a ulaşılamadığında gösterilen özet: puanlardan anlamlı bir çıkarım
// üretmeli ve yorum yazılmamış yanıtta da boş kalmamalı.
test('düşük puanlı sorular iyileştirme listesine girer', () => {
    const summary = localSummary({
        sentiment: 'negative',
        ratings: { Servis: 1, Lezzet: 5 }
    });

    expect(summary).toContain('Ortalama puan: 3.0/5');
    expect(summary).toContain('Öncelikli iyileştirme alanları');
    expect(summary).toContain('Servis (1/5)');
    expect(summary).toContain('yorum yazmamış');
});

test('veri yoksa açıklama döner', () => {
    expect(localSummary({})).toContain('Müşteri serbest yorum yazmamış');
});
