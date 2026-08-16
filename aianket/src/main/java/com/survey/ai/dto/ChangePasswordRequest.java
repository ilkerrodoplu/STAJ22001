package com.survey.ai.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "Mevcut şifre gereklidir")
    private String currentPassword;

    @NotBlank(message = "Yeni şifre gereklidir")
    @Size(min = PasswordRules.MIN_LENGTH, max = PasswordRules.MAX_LENGTH,
            message = PasswordRules.LENGTH_MESSAGE)
    @Pattern(regexp = PasswordRules.PATTERN, message = PasswordRules.MESSAGE)
    private String newPassword;

    @NotBlank(message = "Şifre tekrarı gereklidir")
    private String newPasswordConfirm;

    @AssertTrue(message = "Şifreler eşleşmiyor")
    public boolean isPasswordsMatch() {
        return newPassword != null && newPassword.equals(newPasswordConfirm);
    }
}
