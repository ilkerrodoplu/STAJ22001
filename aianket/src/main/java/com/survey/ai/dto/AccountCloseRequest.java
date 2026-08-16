package com.survey.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Hesap kapatma isteği - kullanıcı kendi şifresiyle onaylar. */
@Data
public class AccountCloseRequest {

    @NotBlank(message = "Şifre gereklidir")
    private String password;
}
