package com.survey.ai.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Şirkete bağlı olmayan site geneli ayarlar. Tek kayıt tutulur ({@link #SINGLETON_ID}).
 */
@Document(collection = "site_settings")
@Data
@NoArgsConstructor
public class SiteSetting {

    public static final String SINGLETON_ID = "site";

    @Id
    private String id = SINGLETON_ID;

    /** Süper admin kayıt kodu; bu kodla kaydolan kullanıcı da süper admin olur. */
    private String adminInviteCode;

    /** Kodun üretilme anı; kod kısa ömürlüdür (bkz. InviteCode.TTL_SECONDS). */
    private LocalDateTime adminInviteCodeUpdatedAt;

    /** Geçerli kodla açılan hesap sayısı; bkz. InviteCode.MAX_USES. */
    private int adminInviteCodeUses;

    /* ---------- Site metinleri (süper admin düzenler, ziyaretçi okur) ---------- */

    private String privacyPolicy;

    private String termsOfService;

    /** Serbest metin: adres, telefon, e-posta, çalışma saatleri. */
    private String contactInfo;

    /** Metinlerin son düzenlenme anı; ziyaretçiye "son güncelleme" olarak gösterilir. */
    private LocalDateTime contentUpdatedAt;

    private LocalDateTime updatedAt;
}
