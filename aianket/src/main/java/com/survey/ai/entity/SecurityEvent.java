package com.survey.ai.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * Yetkisiz erişim denemesi kaydı: kim, nereden, hangi sayfadan, hangi uca.
 * Kullanıcı oturumsuzsa kimlik yerine IP adresi tutulur.
 */
@Document(collection = "security_events")
@Data
@NoArgsConstructor
public class SecurityEvent {

    /** Oturum yok ya da token geçersiz (HTTP 401). */
    public static final String UNAUTHENTICATED = "UNAUTHENTICATED";
    /** Oturum var ama yetki yetersiz (HTTP 403). */
    public static final String FORBIDDEN = "FORBIDDEN";
    /** Ard arda hatalı şifre denemesi sonrası hesap geçici olarak kilitlendi. */
    public static final String ACCOUNT_LOCKED = "ACCOUNT_LOCKED";

    @Id
    private String id;

    private String type;

    /** Oturumlu kullanıcı; anonim istekte null. */
    private String userId;
    private String userEmail;
    private String userName;
    private Set<String> roles;
    private String companyId;

    /** İsteğin geldiği IP (proxy arkasındaysa X-Forwarded-For ilk değeri). */
    private String ip;

    private String method;

    /** Erişilmek istenen uç. */
    private String path;

    /** İsteğin yapıldığı sayfa (Referer). */
    private String page;

    private String userAgent;

    private String reason;

    /** Süper adminin bildirim zilinde okunmamış sayılır. */
    private boolean read;

    /** 90 gün sonra Mongo kaydı kendisi siler; koleksiyon sınırsız büyümesin. */
    @Indexed(expireAfter = "90d")
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Kayıtlı kullanıcı yoksa kimlik olarak IP gösterilir. */
    public String actorLabel() {
        if (userEmail != null && !userEmail.isBlank()) {
            return userEmail;
        }
        return "Anonim (" + (ip == null ? "IP bilinmiyor" : ip) + ")";
    }
}
