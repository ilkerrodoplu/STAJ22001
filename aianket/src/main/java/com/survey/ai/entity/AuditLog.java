package com.survey.ai.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * İşlem denetim kaydı: kim, ne zaman, neyi değiştirdi. Uyarı, askı, rol atama,
 * sahiplik devri, dondurma gibi geri alınması güç işlemler buraya yazılır.
 *
 * Bu bilgi şimdiye kadar yalnızca uygulama logundaydı ve log rotasyonla
 * siliniyordu. Güvenlik olaylarından (security_events) ayrı tutulur: orası
 * "engellenen erişim", burası "yapılan işlem".
 */
@Document(collection = "audit_logs")
@Data
@NoArgsConstructor
public class AuditLog {

    @Id
    private String id;

    /** İşlemi yapan; oturum okunamazsa "sistem" (zamanlanmış görevler). */
    private String actorEmail;
    private String actorName;

    /** Kısa işlem adı, örn. ANKET_UYARILDI, ROL_DEGISTIRILDI. */
    @Indexed
    private String action;

    /** Etkilenen kayıt: anket/şirket/kullanıcı adı ya da id'si. */
    private String target;

    /** Serbest açıklama: sebep, eski/yeni değer. */
    private String detail;

    /** 1 yıl sonra Mongo kaydı kendisi siler; denetim kaydı log'dan uzun yaşamalı. */
    @Indexed(expireAfter = "365d")
    private LocalDateTime createdAt = LocalDateTime.now();
}
