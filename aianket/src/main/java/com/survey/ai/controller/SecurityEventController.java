package com.survey.ai.controller;

import com.survey.ai.entity.SecurityEvent;
import com.survey.ai.service.SecurityEventService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Panelin istemci tarafındaki rol kontrolüne takılan sayfa denemelerini kaydeder.
 *
 * Panel, yetkisi olmayan sayfayı hiç açmadığı için backend'e istek gitmiyor,
 * dolayısıyla deneme ne loglara ne de süper admin paneline düşüyordu. Burası o
 * boşluğu kapatır; sunucu tarafındaki 401/403 kayıtları yerine geçmez, onları
 * tamamlar.
 *
 * Yalnızca oturumu olan kullanıcının denemesi kaydedilir: anlamlı sinyal, yetkisi
 * olmayan bir hesabın kendi sınırının dışını yoklamasıdır. Oturumsuz bildirimler
 * sessizce yutulur. Kaydın gürültüye dönüşmemesi panel tarafında da desteklenir
 * (sekme başına sayfa başına tek bildirim), kötüye kullanım ise RateLimitFilter'daki
 * IP sınırıyla durur.
 */
@RestController
@RequestMapping("/v1/security-events")
@RequiredArgsConstructor
@Tag(name = "Güvenlik Kayıtları", description = "Yetkisiz erişim denemesi bildirimi")
public class SecurityEventController {

    /** Kayda yazılacak sayfa adresi için üst sınır; gövde ile log şişirilmesin. */
    private static final int MAX_PAGE_LENGTH = 300;

    private final SecurityEventService securityEventService;

    @PostMapping("/page-denied")
    public ResponseEntity<Void> pageDenied(@RequestBody Map<String, String> body,
                                           HttpServletRequest request) {
        String page = trim(body.get("page"));
        String section = trim(body.get("section"));

        // Gövdeye rastgele yol yazılıp log şişirilmesin diye yalnızca panel
        // sayfaları kabul edilir.
        if (!page.startsWith("/admin")) {
            return ResponseEntity.noContent().build();
        }

        // Oturumsuz bildirim kaydedilmez. Panel adresine oturum açmadan gelmek
        // bir ihlal değil; istek uca gitmediği için açılan bir veri de yok.
        // Kaydedildiğinde oturumu biten kullanıcının açık sayfası "kayıtsız
        // ziyaretçi denemesi" olarak listeye düşüyor ve denetim listesi
        // gerçek olayları göstermez oluyordu. Sunucu tarafındaki 401/403
        // kayıtları (JwtAuthenticationFilter, erişim reddi) yerinde duruyor.
        if (request.getUserPrincipal() == null) {
            return ResponseEntity.noContent().build();
        }

        securityEventService.record(request, SecurityEvent.FORBIDDEN,
                "Panelde yetkisiz sayfa denemesi"
                        + (section.isEmpty() ? "" : " (" + section + ")"),
                page);

        return ResponseEntity.noContent().build();
    }

    private String trim(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.length() > MAX_PAGE_LENGTH ? trimmed.substring(0, MAX_PAGE_LENGTH) : trimmed;
    }
}
