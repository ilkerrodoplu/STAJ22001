package com.survey.ai.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Token süresi dolduğunda fırlatılan istisna
 */
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class TokenExpiredException extends RuntimeException {

    public TokenExpiredException(String message) {
        super(message);
    }

    public TokenExpiredException(String message, Throwable cause) {
        super(message, cause);
    }
}
