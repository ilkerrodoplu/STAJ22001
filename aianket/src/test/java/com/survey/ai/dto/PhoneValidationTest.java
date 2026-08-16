package com.survey.ai.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Telefon alanı: istemci nasıl yazarsa yazsın boşluklar sunucuda temizlenir,
 * 850'li kurumsal ve 444'lü (7 hane) hatlar geçerli sayılır.
 */
class PhoneValidationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private UserDto userWithPhone(String phone) throws Exception {
        String json = """
                {"firstName":"Hasan","lastName":"Fırça","email":"fircahasan@gmail.com",
                 "password":"Parola123","passwordConfirm":"Parola123","phone":"%s"}
                """.formatted(phone);
        return objectMapper.readValue(json, UserDto.class);
    }

    private boolean phoneAccepted(String phone) throws Exception {
        return validator.validateProperty(userWithPhone(phone), "phone").isEmpty();
    }

    @Test
    void bosluklu_yazilan_numara_temizlenir() throws Exception {
        assertThat(userWithPhone("507 527 38 31").getPhone()).isEqualTo("5075273831");
        assertThat(userWithPhone("+90 507 527 38 31").getPhone()).isEqualTo("+905075273831");
        assertThat(userWithPhone("0 507 527 38 31").getPhone()).isEqualTo("5075273831");
        assertThat(userWithPhone("+90 (507) 527-38-31").getPhone()).isEqualTo("+905075273831");
        assertThat(userWithPhone("0090 507 527 38 31").getPhone()).isEqualTo("+905075273831");
    }

    @Test
    void gecerli_numaralar_kabul_edilir() throws Exception {
        assertThat(phoneAccepted("507 527 38 31")).isTrue();      // cep, ulusal
        assertThat(phoneAccepted("+90 507 527 38 31")).isTrue();  // cep, E.164
        assertThat(phoneAccepted("850 123 45 67")).isTrue();      // kurumsal, 10 hane
        assertThat(phoneAccepted("444 1 444")).isTrue();          // çağrı merkezi, 7 hane
        assertThat(phoneAccepted("212 555 44 33")).isTrue();      // sabit hat
    }

    @Test
    void gecersiz_numaralar_reddedilir() throws Exception {
        assertThat(phoneAccepted("12345")).isFalse();                 // çok kısa
        assertThat(phoneAccepted("5075273831507527383")).isFalse();   // çok uzun
        assertThat(phoneAccepted("telefon yok")).isFalse();           // rakam yok
    }
}
