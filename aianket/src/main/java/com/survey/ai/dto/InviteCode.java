package com.survey.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Kısa ömürlü kayıt kodu (çalışan ve süper admin kodları). Kod okunduğunda
 * süresi dolmuşsa yenilenir; ekranda kalan süre saniye cinsinden gösterilir.
 *
 * ponytail: yenileme kod okunurken (tembel) yapılır, zamanlanmış görev yok.
 * Kodu kimse görüntülemiyorsa dönmez - zaten kimseye gösterilmiyordur.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class InviteCode {

    /** Kodun geçerlilik süresi. Tek yerden değiştirilir. */
    public static final int TTL_SECONDS = 25;

    /**
     * Bir kodun kabul edeceği kayıt sayısı. Süre zaten kısa; sınır, kodu
     * yanındakine okurken üçüncü kişinin de yakalayıp arka arkaya hesap
     * açmasını engeller.
     */
    public static final int MAX_USES = 3;

    private String code;
    private long expiresInSeconds;

    public static boolean expired(LocalDateTime generatedAt) {
        return generatedAt == null || secondsLeft(generatedAt) <= 0;
    }

    public static boolean usedUp(int uses) {
        return uses >= MAX_USES;
    }

    /**
     * Süresi geçmiş ya da kullanım hakkı dolmuş kod kabul edilmez; kodu paylaşan
     * kişi ekranı yenileyip güncel kodu vermelidir.
     */
    public static void requireUsable(LocalDateTime generatedAt, int uses) {
        if (expired(generatedAt)) {
            throw new IllegalStateException(
                    "Kayıt kodunun süresi doldu. Kodu paylaşan kişiden güncel kodu isteyin.");
        }
        if (usedUp(uses)) {
            throw new IllegalStateException(
                    "Bu kayıt kodu kullanım hakkını doldurdu. Kodu paylaşan kişiden yeni kod isteyin.");
        }
    }

    public static InviteCode of(String code, LocalDateTime generatedAt) {
        // En az 1 saniye: 0 dönerse istemci sayaç bitti sanıp durmadan yeniler.
        return new InviteCode(code, Math.max(1, secondsLeft(generatedAt)));
    }

    private static long secondsLeft(LocalDateTime generatedAt) {
        return TTL_SECONDS - Duration.between(generatedAt, LocalDateTime.now()).toSeconds();
    }
}
