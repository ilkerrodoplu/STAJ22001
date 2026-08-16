package com.survey.ai.controller;

import com.survey.ai.dto.AdminCompanyView;
import com.survey.ai.dto.AdminSurveyView;
import com.survey.ai.dto.AdminUserView;
import com.survey.ai.dto.InviteCode;
import com.survey.ai.dto.SiteContentDto;
import com.survey.ai.entity.AuditLog;
import com.survey.ai.entity.SecurityEvent;
import com.survey.ai.entity.SupportMessage;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.enums.CompanyType;
import com.survey.ai.service.AuditService;
import com.survey.ai.service.SecurityEventService;
import com.survey.ai.service.SupportMessageService;
import com.survey.ai.service.SuperAdminService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Süper admin paneli. Tüm uçlar site admini rolüne kapalıdır.
 */
@Slf4j
@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMIN')")
@Tag(name = "Süper Admin", description = "Kullanıcı, anket ve log yönetimi")
public class SuperAdminController {

    private static final int MAX_LOG_LINES = 2000;

    private final SuperAdminService superAdminService;
    private final AuditService auditService;
    private final SupportMessageService supportMessageService;
    private final SecurityEventService securityEventService;

    @Value("${logging.file.name:logs/aisurvey.log}")
    private String logFile;

    /** Panel özeti - şirkete değil tüm sisteme bakar. */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(superAdminService.stats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserView>> users() {
        return ResponseEntity.ok(superAdminService.listUsers());
    }

    /* ---------- Süper admin ekibi ---------- */

    @GetMapping("/admins")
    public ResponseEntity<List<AdminUserView>> admins() {
        return ResponseEntity.ok(superAdminService.listAdmins());
    }

    /** Bu kodla kaydolan kullanıcı da süper admin olur. Kod kısa ömürlüdür. */
    @GetMapping("/invite-code")
    public ResponseEntity<Map<String, Object>> adminInviteCode() {
        return ResponseEntity.ok(inviteCodeBody(superAdminService.getOrCreateAdminInviteCode()));
    }

    @PostMapping("/invite-code/regenerate")
    public ResponseEntity<Map<String, Object>> regenerateAdminInviteCode() {
        return ResponseEntity.ok(inviteCodeBody(superAdminService.regenerateAdminInviteCode()));
    }

    /** Kodun yanında kalan geçerlilik süresi de gider; ekran saniye sayacı gösterir. */
    private Map<String, Object> inviteCodeBody(InviteCode inviteCode) {
        return Map.of("inviteCode", inviteCode.getCode(),
                "expiresInSeconds", inviteCode.getExpiresInSeconds());
    }

    /* ---------- Site metinleri ---------- */

    /** Gizlilik sözleşmesi, kullanım şartları, iletişim. Ziyaretçi ucu: /public/site-content */
    @GetMapping("/site-content")
    public ResponseEntity<SiteContentDto> siteContent() {
        return ResponseEntity.ok(superAdminService.siteContent());
    }

    @PutMapping("/site-content")
    public ResponseEntity<SiteContentDto> updateSiteContent(@Valid @RequestBody SiteContentDto request) {
        return ResponseEntity.ok(superAdminService.updateSiteContent(request));
    }

    /** İşlem denetim kaydı: kim hangi anketi uyardı/askıya aldı, kim rol değiştirdi. */
    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> auditLogs(
            @RequestParam(defaultValue = "200") int limit) {
        return ResponseEntity.ok(auditService.recent(Math.min(limit, 500)));
    }

    /* ---------- Şirket yönetimi ---------- */

    @GetMapping("/companies")
    public ResponseEntity<List<AdminCompanyView>> companies() {
        return ResponseEntity.ok(superAdminService.listCompanies());
    }

    /** Şirket türünü yalnızca site admini değiştirebilir. */
    @PutMapping("/companies/{id}/type")
    public ResponseEntity<AdminCompanyView> changeCompanyType(@PathVariable String id,
                                                              @RequestBody Map<String, String> body) {
        String type = body.getOrDefault("companyType", "").trim();
        if (type.isEmpty()) {
            throw new IllegalArgumentException("Şirket türü zorunludur");
        }
        return ResponseEntity.ok(superAdminService.changeCompanyType(
                id, CompanyType.valueOf(type), body.get("companyTypeOther")));
    }

    /**
     * Sahibini kaybeden şirket sahipsiz kalmasın diye sahiplik devri.
     * Yeni sahip listeden (userId) ya da e-postayla ("Diğer" seçeneği) verilir.
     */
    @PutMapping("/companies/{id}/owner")
    public ResponseEntity<AdminCompanyView> transferOwnership(@PathVariable String id,
                                                              @RequestBody Map<String, String> body) {
        String userId = body.getOrDefault("userId", "").trim();
        String email = body.getOrDefault("email", "").trim();
        if (userId.isEmpty() && email.isEmpty()) {
            throw new IllegalArgumentException("Yeni sahip seçilmedi");
        }
        return ResponseEntity.ok(superAdminService.transferOwnership(id, userId, email));
    }

    /** Şirket düzeyinde yaptırım: dondurulan şirkette giriş ve anket yanıtı durur. */
    @PutMapping("/companies/{id}/status")
    public ResponseEntity<AdminCompanyView> changeCompanyStatus(@PathVariable String id,
                                                                @RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(superAdminService.changeCompanyStatus(
                id, Boolean.TRUE.equals(body.get("suspended"))));
    }

    /** Kullanıcı düzeyinde yaptırım; dondurulan hesap şifresiyle geri alınamaz. */
    @PutMapping("/users/{id}/status")
    public ResponseEntity<AdminUserView> changeUserStatus(@PathVariable String id,
                                                          @RequestBody Map<String, Boolean> body) {
        return ResponseEntity.ok(superAdminService.changeUserStatus(
                id, Boolean.TRUE.equals(body.get("suspended"))));
    }

    /* ---------- Mesajlar ---------- */

    @GetMapping("/messages")
    public ResponseEntity<List<Map<String, Object>>> messageThreads() {
        return ResponseEntity.ok(supportMessageService.adminThreads());
    }

    @GetMapping("/messages/{companyId}")
    public ResponseEntity<List<SupportMessage>> messageThread(@PathVariable String companyId) {
        return ResponseEntity.ok(supportMessageService.adminThread(companyId));
    }

    @PostMapping("/messages/{companyId}")
    public ResponseEntity<SupportMessage> reply(@PathVariable String companyId,
                                                @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(supportMessageService.replyToCompany(companyId, body.get("body")));
    }

    /**
     * Süper admin bildirimleri: şirket mesajları, yetkisiz erişim denemeleri ve
     * loglardaki hatalar.
     */
    @GetMapping("/notifications")
    public ResponseEntity<Map<String, Object>> notifications(
            @RequestParam(defaultValue = "20") int errorLimit) {
        return ResponseEntity.ok(Map.of(
                "unreadMessages", supportMessageService.adminUnreadMessages(),
                "securityEvents", securityEventService.recent(50),
                "errors", recentErrors(Math.min(Math.max(errorLimit, 1), 200))));
    }

    /** Zil rozetindeki sayı: okunmamış şirket mesajı + yetkisiz erişim denemesi. */
    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        long messages = supportMessageService.adminUnreadCount();
        long securityEvents = securityEventService.unreadCount();
        return ResponseEntity.ok(Map.of(
                "unreadCount", messages + securityEvents,
                "unreadMessages", messages,
                "unreadSecurityEvents", securityEvents));
    }

    /** Zil listesi: okunmamış mesajlar + okunmamış yetkisiz erişim denemeleri. */
    @GetMapping("/notifications/feed")
    public ResponseEntity<Map<String, Object>> notificationFeed() {
        return ResponseEntity.ok(Map.of(
                "messages", supportMessageService.adminUnreadMessages(),
                "securityEvents", securityEventService.unread(20)));
    }

    /**
     * Yalnızca yetkisiz erişim kayıtlarını okundu yapar. Şirket mesajları bu
     * uçtan işaretlenmez: zile bakmak mesajı okumak değildir. Önceden bildirim
     * sayfasını açmak tüm şirket mesajlarını okundu yapıyor, mesajlar bir daha
     * hiçbir bildirim listesinde görünmüyordu. Mesaj, konuşma açıldığında
     * (GET /v1/admin/messages/{companyId}) okundu sayılır.
     */
    @PostMapping("/notifications/mark-all-read")
    public ResponseEntity<Void> markAllNotificationsRead() {
        securityEventService.markAllRead();
        return ResponseEntity.noContent().build();
    }

    /** Yetkisiz erişim denemeleri - kim/IP/hangi sayfa/hangi uç. */
    @GetMapping("/security-events")
    public ResponseEntity<List<SecurityEvent>> securityEvents(
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(securityEventService.recent(Math.min(Math.max(limit, 1), 500)));
    }

    @GetMapping("/surveys")
    public ResponseEntity<List<AdminSurveyView>> surveys() {
        return ResponseEntity.ok(superAdminService.listSurveys());
    }

    /** Ankete gelen tüm yanıtlar: süper admin anket içeriğiyle birlikte cevapları da görür. */
    @GetMapping("/surveys/{id}/responses")
    public ResponseEntity<List<SurveyResponse>> surveyResponses(@PathVariable String id) {
        return ResponseEntity.ok(superAdminService.listSurveyResponses(id));
    }

    /**
     * Uygunsuz anket uyarısı: anket anında yayından kalkar, sahibine e-posta ve
     * mesaj gider. Süre dolduğunda düzeltilmemiş anket tamamen silinir.
     */
    @PostMapping("/surveys/{id}/warn")
    public ResponseEntity<AdminSurveyView> warn(@PathVariable String id, @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "").trim();
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("Uyarı sebebi zorunludur");
        }
        return ResponseEntity.ok(superAdminService.warnSurvey(id, reason));
    }

    /**
     * Düzeltmeyi onaylar: uyarı kalkar, anket yeniden yayına girer. Onaylanmadığı
     * sürece anket pasif kalır. /reactivate aynı işi yapar, eski istemciler için durur.
     */
    @PostMapping({"/surveys/{id}/clear-warning", "/surveys/{id}/reactivate"})
    public ResponseEntity<AdminSurveyView> approve(@PathVariable String id) {
        return ResponseEntity.ok(superAdminService.approveSurvey(id));
    }

    /**
     * Uygulama log dosyasının son satırları.
     * ponytail: dosya baştan taranıp son N satır bellekte tutulur; log dosyası
     * rolling policy ile sınırlı olduğu için yeterli. Dosya büyürse sondan okuyan
     * bir tail'e geçilir.
     */
    @GetMapping("/logs")
    public ResponseEntity<Map<String, Object>> logs(@RequestParam(defaultValue = "300") int lines) {
        Path path = Path.of(logFile);

        if (!Files.exists(path)) {
            return ResponseEntity.ok(Map.of(
                    "file", path.toAbsolutePath().toString(),
                    "lines", List.of("Log dosyası bulunamadı: " + path.toAbsolutePath())));
        }

        return ResponseEntity.ok(Map.of(
                "file", path.toAbsolutePath().toString(),
                "lines", tail(Math.min(Math.max(lines, 1), MAX_LOG_LINES), line -> true)));
    }

    /** Bildirim listesi için loglardaki son hata satırları. */
    private List<String> recentErrors(int limit) {
        if (!Files.exists(Path.of(logFile))) {
            return List.of();
        }
        return tail(limit, line -> line.contains("ERROR"));
    }

    private List<String> tail(int limit, java.util.function.Predicate<String> filter) {
        Path path = Path.of(logFile);
        try (Stream<String> stream = Files.lines(path, StandardCharsets.UTF_8)) {
            Deque<String> tail = new ArrayDeque<>(limit);
            stream.filter(filter).forEach(line -> {
                if (tail.size() == limit) {
                    tail.removeFirst();
                }
                tail.addLast(line);
            });
            return List.copyOf(tail);
        } catch (IOException e) {
            log.error("Log dosyası okunamadı: {}", e.getMessage());
            throw new IllegalStateException("Log dosyası okunamadı: " + e.getMessage());
        }
    }
}
