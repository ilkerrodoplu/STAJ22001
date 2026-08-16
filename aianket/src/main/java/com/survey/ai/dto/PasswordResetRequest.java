package com.survey.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetRequest {

    @NotBlank(message = "Token is required")
    private String token;

    @NotBlank(message = "New password is required")
    @Size(min = PasswordRules.MIN_LENGTH, max = PasswordRules.MAX_LENGTH,
            message = PasswordRules.LENGTH_MESSAGE)
    @Pattern(regexp = PasswordRules.PATTERN, message = PasswordRules.MESSAGE)
    private String newPassword;
}
