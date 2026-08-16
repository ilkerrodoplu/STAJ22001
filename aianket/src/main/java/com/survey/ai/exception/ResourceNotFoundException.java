
package com.survey.ai.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Kaynak bulunamadığında fırlatılan istisna
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {

    private final String resourceName;
    private final String fieldName;
    private final Object fieldValue;

    /**
     * Mesaj doğrudan kullanıcıya gösteriliyor. Aranan değer mesaja yazılmaz:
     * kullanıcıya bilgi katmıyor, gönderdiği girdiyi olduğu gibi geri yansıtıyordu.
     * Ayrıntı (hangi alan, hangi değer) alanlarda duruyor ve sunucu loguna düşer.
     */
    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s bulunamadı", resourceName));
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
