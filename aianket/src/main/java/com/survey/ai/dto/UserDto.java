package com.survey.ai.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {

    @NotBlank(message = "Ad gereklidir")
    @Size(min = 2, max = 50, message = "Ad 2-50 karakter arasında olmalıdır")
    private String firstName;

    @NotBlank(message = "Soyad gereklidir")
    @Size(min = 2, max = 50, message = "Soyad 2-50 karakter arasında olmalıdır")
    private String lastName;

    @Email(message = "Geçersiz email formatı")
    @NotBlank(message = "Email gereklidir")
    private String email;

    @NotBlank(message = "Şifre gereklidir")
    @Size(min = PasswordRules.MIN_LENGTH, max = PasswordRules.MAX_LENGTH,
            message = PasswordRules.LENGTH_MESSAGE)
    @Pattern(regexp = PasswordRules.PATTERN, message = PasswordRules.MESSAGE)
    private String password;

    @NotBlank(message = "Şifre tekrarı gereklidir")
    private String passwordConfirm;

    @NotBlank(message = "Telefon gereklidir")
    // 444'lü çağrı merkezi hatları 7 hanedir, alt sınır buna göre.
    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Geçersiz telefon numarası")
    @JsonDeserialize(using = PhoneDeserializer.class)
    private String phone;

    // Rol istemciden alınmaz: kayıt olan kullanıcı her zaman COMPANY_OWNER olur.
    // Ayrı bir "name" alanı yoktur: ad firstName, soyad lastName alanından gelir.

    // Custom validation için
    @AssertTrue(message = "Şifreler eşleşmiyor")
    public boolean isPasswordsMatch() {
        return password != null && password.equals(passwordConfirm);
    }
}