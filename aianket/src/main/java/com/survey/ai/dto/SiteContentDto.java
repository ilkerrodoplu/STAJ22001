package com.survey.ai.dto;

import com.survey.ai.entity.SiteSetting;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Site geneli metinler: gizlilik sözleşmesi, kullanım şartları, iletişim.
 * Süper admin düzenler; ziyaretçi salt okunur uçtan görür.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SiteContentDto {

    /** Sözleşme metinleri uzundur ama sınırsız değil: tek Mongo kaydı 16 MB'ı aşamaz. */
    private static final int MAX_LENGTH = 50_000;

    @Size(max = MAX_LENGTH, message = "Gizlilik sözleşmesi çok uzun")
    private String privacyPolicy;

    @Size(max = MAX_LENGTH, message = "Kullanım şartları çok uzun")
    private String termsOfService;

    @Size(max = MAX_LENGTH, message = "İletişim bilgisi çok uzun")
    private String contactInfo;

    /** Yalnızca okuma yönünde doldurulur; istemciden gelen değer yok sayılır. */
    private LocalDateTime updatedAt;

    public static SiteContentDto from(SiteSetting setting) {
        return SiteContentDto.builder()
                .privacyPolicy(setting.getPrivacyPolicy())
                .termsOfService(setting.getTermsOfService())
                .contactInfo(setting.getContactInfo())
                .updatedAt(setting.getContentUpdatedAt())
                .build();
    }
}
