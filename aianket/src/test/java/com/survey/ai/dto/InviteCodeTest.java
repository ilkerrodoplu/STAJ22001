package com.survey.ai.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** Kısa ömürlü kayıt kodunun süre hesabı. */
class InviteCodeTest {

    @Test
    void suresiDolanKod_yenilenmeli() {
        assertThat(InviteCode.expired(null)).isTrue();
        assertThat(InviteCode.expired(LocalDateTime.now().minusSeconds(InviteCode.TTL_SECONDS + 1))).isTrue();
        assertThat(InviteCode.expired(LocalDateTime.now())).isFalse();
    }

    @Test
    void kullanimHakki_dolan_kod_kabul_edilmez() {
        assertThat(InviteCode.usedUp(InviteCode.MAX_USES - 1)).isFalse();
        assertThat(InviteCode.usedUp(InviteCode.MAX_USES)).isTrue();
    }

    @Test
    void kalanSure_hep_pozitif_doner() {
        // Sıfır dönerse istemcinin sayacı biter ve kodu durmadan yeniler.
        assertThat(InviteCode.of("ABC", LocalDateTime.now().minusSeconds(999)).getExpiresInSeconds())
                .isEqualTo(1);
        assertThat(InviteCode.of("ABC", LocalDateTime.now()).getExpiresInSeconds())
                .isEqualTo(InviteCode.TTL_SECONDS);
    }
}
