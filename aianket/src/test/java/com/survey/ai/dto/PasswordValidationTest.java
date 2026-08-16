package com.survey.ai.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Kayıt, şifre değiştirme ve şifre sıfırlama aynı şifre kuralını kullanır.
 * Eskiden sıfırlama ucu ayrı bir desen taşıyordu ve {@code @#$%^&+=!} dışındaki
 * özel karakterleri reddediyordu; kullanıcı kayıt olurken kabul edilen şifresini
 * sıfırlarken giremiyordu.
 */
class PasswordValidationTest {

    private final Validator validator;

    PasswordValidationTest() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            this.validator = factory.getValidator();
        }
    }

    @Test
    void nokta_iceren_sifre_sifirlamada_kabul_edilir() {
        assertThat(resetErrors("Ankara2026.")).isEmpty();
    }

    @Test
    void ozel_karaktersiz_sifre_de_kabul_edilir() {
        assertThat(resetErrors("Ankara2026")).isEmpty();
    }

    @Test
    void kisa_sifre_reddedilir() {
        assertThat(resetErrors("Ank2026")).isNotEmpty();
    }

    @Test
    void buyuk_harfsiz_sifre_reddedilir() {
        assertThat(resetErrors("ankara2026")).isNotEmpty();
    }

    @Test
    void rakamsiz_sifre_reddedilir() {
        assertThat(resetErrors("AnkaraSehir")).isNotEmpty();
    }

    /** Aynı şifre üç akışta da aynı sonucu vermeli. */
    @Test
    void kayit_degistirme_ve_sifirlama_ayni_kurali_uygular() {
        String password = "Ankara2026.";

        UserDto kayit = new UserDto();
        kayit.setPassword(password);

        ChangePasswordRequest degistirme = new ChangePasswordRequest();
        degistirme.setNewPassword(password);

        assertThat(validator.validateProperty(kayit, "password")).isEmpty();
        assertThat(validator.validateProperty(degistirme, "newPassword")).isEmpty();
        assertThat(resetErrors(password)).isEmpty();
    }

    private Set<ConstraintViolation<PasswordResetRequest>> resetErrors(String password) {
        PasswordResetRequest request = new PasswordResetRequest();
        request.setNewPassword(password);
        return validator.validateProperty(request, "newPassword");
    }
}
