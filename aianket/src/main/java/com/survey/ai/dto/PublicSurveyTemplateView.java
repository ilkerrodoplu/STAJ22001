package com.survey.ai.dto;

import com.survey.ai.entity.SurveyQuestion;
import com.survey.ai.entity.SurveyTemplate;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * QR ile gelen katılımcıya gösterilen anket. Soru metinleri ve şıklar dışarı
 * çıkar; site yönetiminin moderasyon notları (uyarı sebebi ve anı, askıya alma
 * bilgisi) ile anketi hazırlayan kullanıcı çıkmaz.
 * <p>
 * Karşılığı {@link PublicCompanyView}: ikisi de oturumsuz uçlarda entity'nin
 * tamamının dışarı sızmasını engellemek için var.
 */
@Data
@Builder
public class PublicSurveyTemplateView {

    private String id;
    private String name;
    private String description;
    private String companyId;
    private String status;
    private Boolean active;
    private List<SurveyQuestion> questions;

    public static PublicSurveyTemplateView from(SurveyTemplate template) {
        return PublicSurveyTemplateView.builder()
                .id(template.getId())
                .name(template.getName())
                .description(template.getDescription())
                .companyId(template.getCompanyId())
                .status(template.getStatus())
                .active(template.getActive())
                .questions(template.getQuestions())
                .build();
    }
}
