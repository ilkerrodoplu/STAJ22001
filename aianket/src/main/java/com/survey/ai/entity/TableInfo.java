package com.survey.ai.entity;

import lombok.Data;

/**
 * Restoran/kafe masası. Masadaki QR kodundan gelen anket yanıtlarını
 * masaya bağlamak için kullanılır; başka şirket türlerinde yeri yoktur.
 */
@Data
public class TableInfo {
    private String id;
    private String name;
    private String qrCodeUrl;
    private Integer capacity;
    private String status; // ACTIVE, INACTIVE, OCCUPIED
}
