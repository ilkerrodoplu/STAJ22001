package com.survey.ai.dto;

import com.survey.ai.entity.SurveyQuestion;
import com.survey.ai.entity.SurveyTemplate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/** Süper admin anket listesi satırı: anket + sahibi + uyarı durumu. */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AdminSurveyView {

    private String id;
    private String name;
    private String description;
    private String companyId;
    private String companyName;
    private String ownerEmail;
    private int questionCount;

    /** Anket içeriği: süper admin uyarı vermeden önce soruları görebilsin. */
    private List<SurveyQuestion> questions;

    private Boolean active;
    private LocalDateTime warnedAt;
    private String warningReason;

    /** Bu tarihe kadar düzeltilmezse anket tamamen silinir. */
    private LocalDateTime suspendAfter;

    /** Uyarıdan sonra şirket anketi düzenledi; süper adminin onayını bekliyor. */
    private boolean fixPending;

    private boolean suspendedByAdmin;
    private LocalDateTime suspendedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AdminSurveyView of(SurveyTemplate template, String companyName, String ownerEmail, int warningDays) {
        return new AdminSurveyView(
                template.getId(),
                template.getName(),
                template.getDescription(),
                template.getCompanyId(),
                companyName,
                ownerEmail,
                template.getQuestions() == null ? 0 : template.getQuestions().size(),
                template.getQuestions() == null ? List.of() : template.getQuestions(),
                template.getActive(),
                template.getWarnedAt(),
                template.getWarningReason(),
                template.getWarnedAt() == null ? null : template.getWarnedAt().plusDays(warningDays),
                template.getWarnedAt() != null && template.getUpdatedAt() != null
                        && template.getUpdatedAt().isAfter(template.getWarnedAt()),
                template.isSuspendedByAdmin(),
                template.getSuspendedAt(),
                template.getCreatedAt(),
                template.getUpdatedAt());
    }
}
