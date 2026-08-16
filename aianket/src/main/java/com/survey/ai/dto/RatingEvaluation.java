package com.survey.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Arrays;
import java.util.Map;
import java.util.Objects;

/**
 * Yıldızlı (1-5) soruların puanı: ortalama alınıp 15'lik skalaya taşınır, böylece
 * soru sayısı değişse de eşik aynı kalır. Örnek: 5/3/4 -> ortalama 4 -> 12/15.
 *
 * Değerlendirme: 6 ve altı kötü (negative), 10'a kadar ortalama (neutral),
 * 10 ve üstü mükemmel (positive). Duygu analizinde yorumu olmayan yanıtın
 * duygusu bu puandan gelir.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class RatingEvaluation {

    /** Puan skalası; 3 soruluk ankette toplam puanla aynı olsun diye 15. */
    public static final double SCALE = 15.0;

    private static final double POOR_MAX = 6.0;
    private static final double GREAT_MIN = 10.0;

    private double score;
    private String sentiment;
    private String label;

    /** Yıldızlı soru yoksa (ya da hepsi boş bırakılmışsa) null. */
    public static RatingEvaluation of(Map<String, Integer> ratings) {
        if (ratings == null || ratings.isEmpty()) {
            return null;
        }
        // 0 ve altı "yanıtlanmadı" demektir; ortalamayı aşağı çekmemeli.
        double[] answers = ratings.values().stream()
                .filter(Objects::nonNull)
                .filter(value -> value > 0)
                .mapToDouble(Integer::doubleValue)
                .toArray();

        if (answers.length == 0) {
            return null;
        }

        double average = Arrays.stream(answers).average().orElse(0);
        return of(Math.round(average * 3 * 10) / 10.0);
    }

    public static RatingEvaluation of(double score) {
        if (score <= POOR_MAX) {
            return new RatingEvaluation(score, "negative", "Kötü");
        }
        if (score < GREAT_MIN) {
            return new RatingEvaluation(score, "neutral", "Ortalama");
        }
        return new RatingEvaluation(score, "positive", "Mükemmel");
    }
}
