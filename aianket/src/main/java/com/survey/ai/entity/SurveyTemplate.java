package com.survey.ai.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "survey_templates")
public class SurveyTemplate {
    @Id
    private String id;
    private String name;
    private String description;
    private String companyId;
    private List<SurveyQuestion> questions;
    private String status ;
    private Boolean active = true;

    /**
     * Anketi hazırlayan kullanıcı. Çalışan şirketten çıkarıldığında anket şirkette
     * kalır ve bu alan şirket sahibine geçer.
     */
    private String createdBy;

    /**
     * Hazırlayanın adı; listede id yerine isim görünsün diye okuma sırasında
     * doldurulur, veritabanına yazılmaz (isim değişirse bayatlamasın).
     */
    @org.springframework.data.annotation.Transient
    private String createdByName;

    /** Site admininin uygunsuz bulduğu ankette uyarı anı; 1 hafta içinde düzeltilmezse pasife alınır. */
    private LocalDateTime warnedAt;

    private String warningReason;

    /**
     * Uyarı sonrası düzeltilmediği için site admini tarafından pasife alındı.
     * Şirket sahibi bu anketi kendisi yayına alamaz; süper admine mesaj atıp
     * yeniden aktifleştirilmesini istemesi gerekir.
     */
    private Boolean suspendedByAdmin;

    private LocalDateTime suspendedAt;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    public boolean isSuspendedByAdmin() {
        return Boolean.TRUE.equals(suspendedByAdmin);
    }
}
