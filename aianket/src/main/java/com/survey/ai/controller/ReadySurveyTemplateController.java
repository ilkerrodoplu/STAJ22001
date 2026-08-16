package com.survey.ai.controller;

import com.survey.ai.dto.ReadySurveyTemplateDto;
import com.survey.ai.service.ReadySurveyTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Slf4j
@RestController
@RequestMapping("/v1/ready-survey-templates")
@RequiredArgsConstructor
public class ReadySurveyTemplateController {

    private final ReadySurveyTemplateService service;

    /**
     * Tüm aktif hazır şablonları listeler
     * GET /api/v1/ready-survey-templates
     */
    @GetMapping
    public ResponseEntity<List<ReadySurveyTemplateDto>> getAllTemplates() {
        log.info("Tüm hazır şablonlar istendi");
        List<ReadySurveyTemplateDto> templates = service.getAllActiveTemplates();
        return ResponseEntity.ok(templates);
    }

    /**
     * Kategori bazında şablonları listeler
     * GET /api/v1/ready-survey-templates/category/{category}
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<ReadySurveyTemplateDto>> getTemplatesByCategory(
            @PathVariable String category) {
        log.info("Kategori bazında hazır şablonlar istendi: {}", category);
        List<ReadySurveyTemplateDto> templates = service.getTemplatesByCategory(category);
        return ResponseEntity.ok(templates);
    }

    /**
     * Şirketin türüne uygun hazır şablonlar + her şirkete açık genel kalıp
     * GET /api/v1/ready-survey-templates/for-company/{companyId}
     */
    @GetMapping("/for-company/{companyId}")
    public ResponseEntity<List<ReadySurveyTemplateDto>> getTemplatesForCompany(
            @PathVariable String companyId) {
        log.info("Şirkete uygun hazır şablonlar istendi: {}", companyId);
        return ResponseEntity.ok(service.getTemplatesForCompany(companyId));
    }

    /**
     * ID ile şablon getirir
     * GET /api/v1/ready-survey-templates/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ReadySurveyTemplateDto> getTemplateById(@PathVariable String id) {
        log.info("ID ile hazır şablon istendi: {}", id);
        return service.getTemplateById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Tüm kategorileri listeler
     * GET /api/v1/ready-survey-templates/categories
     */
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getAllCategories() {
        log.info("Tüm kategoriler istendi");
        List<String> categories = service.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * İstatistikleri getirir
     * GET /api/v1/ready-survey-templates/statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        log.info("Hazır şablon istatistikleri istendi");

        Map<String, Object> statistics = new HashMap<>();
        statistics.put("totalActiveTemplates", service.countActiveTemplates());
        statistics.put("cafeTemplates", service.countTemplatesByCategory("cafe"));
        statistics.put("restoranTemplates", service.countTemplatesByCategory("restoran"));
        statistics.put("klinikTemplates", service.countTemplatesByCategory("klinik"));
        statistics.put("categories", service.getAllCategories());

        return ResponseEntity.ok(statistics);
    }
}