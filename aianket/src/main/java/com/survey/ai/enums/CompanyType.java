package com.survey.ai.enums;

import lombok.Getter;

/**
 * Şirket türleri. Hazır anket şablonları (ready_survey_templates) bu türün
 * adına göre kategorilenir; OTHER seçildiğinde GENERIC_CATEGORY kullanılır.
 */
@Getter
public enum CompanyType {
    TECHNOLOGY("Teknoloji/Yazılım Şirketleri"),
    ECOMMERCE_RETAIL("E-Ticaret & Perakende"),
    SERVICE("Hizmet Sektörü"),
    RESTAURANT_CAFE("Restoran & Kafe"),
    OTHER("Diğer");

    /** Her şirket türünün göreceği ortak ("genel") şablon kategorisi. */
    public static final String GENERIC_CATEGORY = "GENEL";

    private final String label;

    CompanyType(String label) {
        this.label = label;
    }
}
