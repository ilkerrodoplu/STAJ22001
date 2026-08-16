package com.survey.ai.controller;

import com.survey.ai.dto.SiteContentDto;
import com.survey.ai.service.SuperAdminService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Ziyaretçiye açık site metinleri: gizlilik sözleşmesi, kullanım şartları,
 * iletişim. Bu metinler zaten herkese gösterilmek için yazılıyor; oturum
 * istemek anlamsız olurdu. Yazma yalnızca süper admin ucundadır.
 */
@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
@Tag(name = "Site Metinleri", description = "Sözleşme ve iletişim metinleri (herkese açık)")
public class PublicSiteController {

    private final SuperAdminService superAdminService;

    @GetMapping("/site-content")
    public ResponseEntity<SiteContentDto> siteContent() {
        return ResponseEntity.ok(superAdminService.siteContent());
    }
}
