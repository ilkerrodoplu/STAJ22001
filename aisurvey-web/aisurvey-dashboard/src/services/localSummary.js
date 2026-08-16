const STAR_LABELS = { 1: 'çok kötü', 2: 'kötü', 3: 'orta', 4: 'iyi', 5: 'çok iyi' };

/**
 * AI agent'ına ulaşılamadığında gösterilen özet: yanıtın kendi verisinden
 * (puanlar, şıklar, duygu, yorum) çıkarılır. Dışarıya istek atmaz, bu yüzden
 * her zaman bir sonuç üretir.
 */
export const localSummary = (data = {}) => {
    const ratings = Object.entries(data.ratings || {})
        .filter(([, value]) => typeof value === 'number' && value > 0);
    const choices = Object.entries(data.choices || {});
    const lines = [];

    if (ratings.length > 0) {
        const average = ratings.reduce((sum, [, value]) => sum + value, 0) / ratings.length;
        const sorted = [...ratings].sort((a, b) => b[1] - a[1]);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];

        lines.push(`Ortalama puan: ${average.toFixed(1)}/5 (${ratings.length} soru).`);
        lines.push(`En yüksek: "${best[0]}" - ${best[1]}/5 (${STAR_LABELS[best[1]]}).`);
        if (worst[0] !== best[0]) {
            lines.push(`En düşük: "${worst[0]}" - ${worst[1]}/5 (${STAR_LABELS[worst[1]]}).`);
        }

        const weak = sorted.filter(([, value]) => value <= 2);
        if (weak.length > 0) {
            lines.push('');
            lines.push('Öncelikli iyileştirme alanları:');
            weak.forEach(([question, value]) => lines.push(`• ${question} (${value}/5)`));
        } else if (average >= 4) {
            lines.push('');
            lines.push('Müşteri genel olarak memnun; bu seviyeyi koruyun.');
        }
    }

    if (choices.length > 0) {
        lines.push('');
        lines.push('Seçimler:');
        choices.forEach(([question, choice]) => lines.push(`• ${question}: ${choice}`));
    }

    if (data.comment) {
        lines.push('');
        lines.push(`Müşterinin yorumu: "${data.comment}"`);
    } else {
        lines.push('');
        lines.push('Müşteri serbest yorum yazmamış; değerlendirme yalnızca puanlara dayanıyor.');
    }

    if (data.sentiment) {
        const label = data.sentiment === 'positive' ? 'olumlu'
            : data.sentiment === 'negative' ? 'olumsuz' : 'nötr';
        lines.unshift(`Genel duygu: ${label}.`, '');
    }

    if (lines.length === 0) {
        return 'Bu yanıtta değerlendirilecek veri yok.';
    }

    lines.push('');
    lines.push('— AI servisine ulaşılamadığı için bu özet panel tarafından üretildi.');
    return lines.join('\n');
};
