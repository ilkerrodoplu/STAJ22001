package com.survey.ai.controller;

import com.survey.ai.entity.SurveyNotification;
import com.survey.ai.service.SurveyNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/notifications")
@RequiredArgsConstructor
public class SurveyNotificationController {

    private final SurveyNotificationService notificationService;

    // 🔔 Ana endpoint - Frontend'in kullandığı
    @GetMapping
    public ResponseEntity<Page<SurveyNotification>> getNotifications(
            @RequestParam String companyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {

        Page<SurveyNotification> notifications = notificationService.getNotifications(
                companyId, page, size, type, status);
        return ResponseEntity.ok(notifications);
    }

    // 📊 Okunmamış bildirim sayısı - Query param ile
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@RequestParam String companyId) {
        long count = notificationService.getUnreadNotificationCount(companyId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // ✅ Tek bildirimi okundu işaretle
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<SurveyNotification> markAsRead(@PathVariable String notificationId) {
        SurveyNotification notification = notificationService.markAsRead(notificationId);
        return ResponseEntity.ok(notification);
    }

    // ✅ Tüm bildirimleri okundu işaretle - Frontend uyumlu
    @PutMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllAsRead(@RequestBody Map<String, String> request) {
        String companyId = request.get("companyId");
        notificationService.markAllAsRead(companyId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    // 🗑️ Bildirimi sil
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Map<String, String>> deleteNotification(@PathVariable String notificationId) {
        notificationService.deleteNotification(notificationId);
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }

    // ========== ESKİ ENDPOINT'LER - GERİYE UYUMLULUK İÇİN ==========

    // 📊 Okunmamış bildirim sayısı - Path param ile (ESKİ)
    @GetMapping("/company/{companyId}/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCountByPath(@PathVariable String companyId) {
        long count = notificationService.getUnreadNotificationCount(companyId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // 🔔 Bildirimler - Path param ile (ESKİ)
    @GetMapping("/{companyId}")
    public ResponseEntity<Page<SurveyNotification>> getNotificationsByPath(
            @PathVariable String companyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {

        Page<SurveyNotification> notifications = notificationService.getNotifications(
                companyId, page, size, type, status);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/company/{companyId}")
    public ResponseEntity<List<SurveyNotification>> getNotificationsByCompany(@PathVariable String companyId) {
        List<SurveyNotification> notifications = notificationService.getNotificationsByCompany(companyId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/company/{companyId}/paged")
    public ResponseEntity<Page<SurveyNotification>> getNotificationsPaged(
            @PathVariable String companyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SurveyNotification> notifications = notificationService.getNotificationsByCompany(companyId, page, size);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/company/{companyId}/unread")
    public ResponseEntity<List<SurveyNotification>> getUnreadNotifications(@PathVariable String companyId) {
        List<SurveyNotification> notifications = notificationService.getUnreadNotifications(companyId);
        return ResponseEntity.ok(notifications);
    }

    @PutMapping("/company/{companyId}/read-all")
    public ResponseEntity<Map<String, String>> markAllAsReadByPath(@PathVariable String companyId) {
        notificationService.markAllAsRead(companyId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @GetMapping("/company/{companyId}/sentiment/{sentiment}")
    public ResponseEntity<List<SurveyNotification>> getNotificationsBySentiment(
            @PathVariable String companyId,
            @PathVariable String sentiment) {
        List<SurveyNotification> notifications = notificationService.getNotificationsBySentiment(companyId, sentiment);
        return ResponseEntity.ok(notifications);
    }
}