package com.survey.ai.exception;

import java.time.LocalDateTime;

/**
 * Kapatılmış (pasife alınmış) hesapla giriş denemesi.
 * Kullanıcıya kalıcı silinmeye kalan süre ve geri alma seçeneği gösterilir.
 */
public class AccountClosedException extends RuntimeException {

    private final LocalDateTime deactivatedAt;
    private final LocalDateTime deleteAt;

    public AccountClosedException(LocalDateTime deactivatedAt, LocalDateTime deleteAt) {
        super("Hesabınız kapatılmış durumda. Silinmeden önce geri alabilirsiniz.");
        this.deactivatedAt = deactivatedAt;
        this.deleteAt = deleteAt;
    }

    public LocalDateTime getDeactivatedAt() {
        return deactivatedAt;
    }

    public LocalDateTime getDeleteAt() {
        return deleteAt;
    }
}
