package com.survey.ai.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Kimlik doğrulama hatası olduğunda fırlatılan istisna
 */
@Getter
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class AuthenticationException extends RuntimeException {

    /**
     * Hesap kilitlenmeden önce kalan deneme hakkı; giriş ekranında gösterilir.
     * Yalnızca hatalı şifre denemesinde dolar, diğer kimlik hatalarında null'dır.
     */
    private final Integer remainingAttempts;

    public AuthenticationException(String message) {
        this(message, (Integer) null);
    }

    public AuthenticationException(String message, Integer remainingAttempts) {
        super(message);
        this.remainingAttempts = remainingAttempts;
    }

    public AuthenticationException(String message, Throwable cause) {
        super(message, cause);
        this.remainingAttempts = null;
    }
}
