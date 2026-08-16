package com.survey.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Şıklı (MULTIPLE_CHOICE) bir sorunun şık dağılımı: hangi seçenek kaç kez
 * tercih edilmiş. Şıklar puan değil kategori olduğu için ortalama anlamsızdır;
 * rapor ekranında sayı ve yüzdeyle gösterilir.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChoiceBreakdownDTO {

    private String questionText;
    private long totalAnswers;

    /** Çoktan aza sıralı; ilk eleman en çok tercih edilen şık. */
    private List<ChoiceCount> options;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ChoiceCount {
        private String option;
        private long count;
        private double percentage;
    }
}
