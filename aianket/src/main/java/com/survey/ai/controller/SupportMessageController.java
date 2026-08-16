package com.survey.ai.controller;

import com.survey.ai.entity.SupportMessage;
import com.survey.ai.service.SupportMessageService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Şirket tarafının site yönetimiyle yazışması. Şirket kullanıcısı yalnızca
 * kendi şirketinin konuşmasını görür.
 */
@RestController
@RequestMapping("/v1/messages")
@RequiredArgsConstructor
@Tag(name = "Site Yönetimi Mesajları", description = "Şirket ↔ süper admin yazışması")
public class SupportMessageController {

    private final SupportMessageService supportMessageService;

    @GetMapping
    public ResponseEntity<List<SupportMessage>> thread() {
        return ResponseEntity.ok(supportMessageService.companyThread());
    }

    /** surveyTemplateId isteğe bağlı: askıdan çıkarma talebini ankete bağlar. */
    @PostMapping
    public ResponseEntity<SupportMessage> send(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(supportMessageService.sendToAdmin(
                body.get("body"), body.get("surveyTemplateId")));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        return ResponseEntity.ok(Map.of("unreadCount", supportMessageService.companyUnreadCount()));
    }
}
