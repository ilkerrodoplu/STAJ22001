package com.survey.ai.dto;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Yıldızlı soruların puanı 15'lik skalaya taşınır: 6 ve altı kötü,
 * 10'a kadar ortalama, 10 ve üstü mükemmel.
 */
class RatingEvaluationTest {

    @Test
    void ucSoruda_puanlarin_toplami_15lik_skalayla_ayni_cikar() {
        // 5 + 3 + 4 = 12 -> ortalama 4 -> 12/15
        RatingEvaluation evaluation = RatingEvaluation.of(puanlar(5, 3, 4));

        assertThat(evaluation.getScore()).isEqualTo(12.0);
        assertThat(evaluation.getLabel()).isEqualTo("Mükemmel");
        assertThat(evaluation.getSentiment()).isEqualTo("positive");
    }

    @Test
    void soru_sayisi_degisse_de_esikler_ayni_kalir() {
        // Tek soruya 4 yıldız da 12/15 eder; eşik soru sayısından bağımsızdır.
        assertThat(RatingEvaluation.of(puanlar(4)).getScore()).isEqualTo(12.0);
        assertThat(RatingEvaluation.of(puanlar(4, 4, 4, 4, 4)).getScore()).isEqualTo(12.0);
    }

    @Test
    void esikler_kotu_ortalama_mukemmel_ayrimini_yapar() {
        assertThat(RatingEvaluation.of(puanlar(2, 2, 2)).getLabel()).isEqualTo("Kötü");       // 6.0
        assertThat(RatingEvaluation.of(puanlar(2, 2, 3)).getLabel()).isEqualTo("Ortalama");   // 7.0
        assertThat(RatingEvaluation.of(puanlar(3, 3, 3)).getLabel()).isEqualTo("Ortalama");   // 9.0
        assertThat(RatingEvaluation.of(puanlar(3, 3, 4)).getLabel()).isEqualTo("Mükemmel");   // 10.0
    }

    @Test
    void yanitlanmamis_sorular_ortalamayi_bozmaz() {
        // 0 = boş bırakılmış soru; yalnızca gerçek yıldızlar sayılır.
        assertThat(RatingEvaluation.of(puanlar(5, 0, 0)).getScore()).isEqualTo(15.0);
        assertThat(RatingEvaluation.of(puanlar(0, 0))).isNull();
        assertThat(RatingEvaluation.of(Map.of())).isNull();
        assertThat(RatingEvaluation.of(null)).isNull();
    }

    private Map<String, Integer> puanlar(int... values) {
        Map<String, Integer> ratings = new LinkedHashMap<>();
        for (int i = 0; i < values.length; i++) {
            ratings.put("Soru " + (i + 1), values[i]);
        }
        return ratings;
    }
}
