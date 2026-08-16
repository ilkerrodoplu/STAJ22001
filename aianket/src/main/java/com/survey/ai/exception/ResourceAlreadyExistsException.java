package com.survey.ai.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Kaynak zaten mevcut olduğunda fırlatılan istisna
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class ResourceAlreadyExistsException extends RuntimeException {

    private final String resourceName;
    private final String fieldName;
    private final Object fieldValue;

    /**
     * Mesaj doğrudan kullanıcıya gösteriliyor (panel {@code data.message} basıyor),
     * bu yüzden Türkçe ve okunabilir. Gönderilen değer geri yazılmaz: kullanıcıya
     * bilgi katmıyor, hata mesajını girdi yansıtma yüzeyine çeviriyordu.
     */
    public ResourceAlreadyExistsException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("Bu %s ile kayıtlı bir %s zaten var", fieldName, resourceName));
        this.resourceName = resourceName;
        this.fieldName = fieldName;
        this.fieldValue = fieldValue;
    }

    public String getResourceName() {
        return resourceName;
    }

    public String getFieldName() {
        return fieldName;
    }

    public Object getFieldValue() {
        return fieldValue;
    }
}
