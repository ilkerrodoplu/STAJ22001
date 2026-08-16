package com.survey.ai.controller;

import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.service.SecurityService;
import com.survey.ai.service.SurveyTemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/v1/survey-templates")
@Tag(name = "Anket Şablonları", description = "Anket şablonları yönetim API'si")
public class SurveyTemplateController {

    @Autowired
    private SurveyTemplateService surveyTemplateService;

    @Autowired
    private SecurityService securityService;

    @GetMapping("/company/{companyId}")
    public ResponseEntity<List<SurveyTemplate>> getTemplatesByCompanyId(@PathVariable String companyId) {
        return ResponseEntity.ok(surveyTemplateService.getActiveTemplatesByCompanyId(companyId));
    }

    /**
     * Yol değişkeni {@code companyId} değil {@code id} olduğu için
     * CompanyScopeInterceptor bu uca bakmıyor; kapsam kontrolü burada yapılır.
     * Servisteki {@code getSurveyTemplateById} kontrolsüz kalmalıdır: anonim
     * anket doldurma akışı (QrCodeController, yanıt kaydetme) da onu kullanıyor.
     */
    @GetMapping("/{id}")
    public ResponseEntity<SurveyTemplate> getTemplateById(@PathVariable String id) {
        SurveyTemplate template = surveyTemplateService.getSurveyTemplateById(id);
        securityService.requireOwnCompany(template.getCompanyId());
        return ResponseEntity.ok(template);
    }
    @GetMapping
    public ResponseEntity<List<SurveyTemplate>> getAllTemplates() {
        return ResponseEntity.ok(surveyTemplateService.getActiveTemplates());
    }

    @PostMapping
    public ResponseEntity<SurveyTemplate> createTemplate(@RequestBody SurveyTemplate template) {
        return new ResponseEntity<>(surveyTemplateService.saveSurveyTemplate(template), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SurveyTemplate> updateTemplate(@PathVariable String id, @RequestBody SurveyTemplate template) {
        return ResponseEntity.ok(surveyTemplateService.updateSurveyTemplate(id, template));
    }

    /** Kalıcı silme; yayından geçici kaldırma anketin durumunu "Pasif" yaparak yapılır. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable String id) {
        surveyTemplateService.deleteSurveyTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
