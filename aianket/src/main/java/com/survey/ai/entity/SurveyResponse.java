package com.survey.ai.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "survey_responses")
public class SurveyResponse {

    @Id
    private String id;

    /** Eski kayıtlarda dolu; anket artık kişisel bilgi sormaz. */
    @Deprecated
    private String name;

    /** Eski kayıtlarda dolu; anket artık e-posta sormaz. */
    @Deprecated
    private String email;

    /** Sunucu tarafından şablondan yazılır; istemciden geleni dikkate alınmaz. */
    private String companyId;

    @NotBlank
    private String surveyTemplateId;

    private LocalDate visitDate;

    /** Restoran/kafe masalarındaki QR kodundan gelen masa numarası; diğer türlerde null. */
    @Size(max = 50, message = "Masa numarası çok uzun")
    private String tableNumber;

    @Size(max = 100, message = "Çok fazla puanlanmış soru gönderildi")
    private Map<String, Integer> ratings;

    /**
     * Çoktan seçmeli yanıtlar: soru metni -> seçilen şık. Duygu analizine
     * girmez; şıklar ("Tesadüfen", "Reklam" gibi) görüş değil, kategoridir.
     */
    @Size(max = 100, message = "Çok fazla şık yanıtı gönderildi")
    private Map<String, String> choices;

    /**
     * Yalnızca serbest metin yanıtları; duygu analizine giren tek alan.
     * Uzunluk sınırı şart: uç anonim ve sınırsızken tek istekle megabaytlarca
     * metin yazılabiliyor, hem veritabanı hem duygu analizi kuyruğu şişiyordu.
     */
    @Size(max = 2000, message = "Yorum en fazla 2000 karakter olabilir")
    private String comment;

    /** Yıldızlı soruların 15'lik skaladaki puanı; yıldızlı soru yoksa null. */
    private Double ratingScore;

    private String sentiment;

    private double sentimentScore;

    private LocalDateTime submissionDate = LocalDateTime.now();

}