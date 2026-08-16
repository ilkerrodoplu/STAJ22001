package com.survey.ai.controller;

import com.survey.ai.entity.Company;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.service.CompanyService;
import com.survey.ai.service.SurveyTemplateService;
import com.survey.ai.service.SurveyResponseService;
import com.survey.ai.entity.SurveyResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/v1/surveys")
public class SurveyControllerV2 {

    @Autowired
    private CompanyService companyService;

    @Autowired
    private SurveyTemplateService surveyTemplateService;

    @Autowired
    private SurveyResponseService surveyResponseService;

    /** Anket linkinin adresi; tek kaynak app.frontend.url (bkz. application.properties). */
    @Value("${app.frontend.url}")
    private String frontendUrl;

    /**
     * Şifrelenmiş URL kodu için gerekli anket bilgilerini getirir
     */
    @GetMapping("/info/{encodedData}")
    public ResponseEntity<Map<String, Object>> getSurveyInfo(@PathVariable String encodedData) {
        try {
            // URL güvenli Base64'ü normal Base64'e çevir
            String base64 = encodedData
                    .replace("-", "+")
                    .replace("_", "/");

            // Padding ekle gerekirse
            while (base64.length() % 4 != 0) {
                base64 += "=";
            }

            // Base64'ü çöz
            byte[] decodedBytes = Base64.getDecoder().decode(base64);
            String decoded = new String(decodedBytes);

            // ID'leri ayır
            String[] parts = decoded.split(":");
            if (parts.length != 2) {
                throw new IllegalArgumentException("Geçersiz kod formatı");
            }

            String companyId = parts[0];
            String surveyId = parts[1];

            // Restoran ve anket bilgilerini getir
            Company company = companyService.getCompanyById(companyId);
            SurveyTemplate surveyTemplate = surveyTemplateService.getSurveyTemplateById(surveyId);

            // Cevabı hazırla
            Map<String, Object> response = new HashMap<>();
            response.put("company", company);
            response.put("surveyTemplate", surveyTemplate);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Geçersiz anket kodu: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Anket yanıtını kaydet
     */
    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitSurvey(@RequestBody SurveyResponse surveyResponse) {
        try {
            SurveyResponse savedResponse = surveyResponseService.saveSurveyResponse(surveyResponse);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Anket başarıyla kaydedildi");
            response.put("id", savedResponse.getId());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Anket kaydedilemedi: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * QR Kod oluşturma için URL üretir
     */
    @GetMapping("/generate-url/{companyId}/{surveyId}")
    public ResponseEntity<Map<String, Object>> generateSurveyUrl(
            @PathVariable String companyId,
            @PathVariable String surveyId) {
        try {
            // Restoran ve anket varlığını kontrol et
            Company company = companyService.getCompanyById(companyId);
            SurveyTemplate surveyTemplate = surveyTemplateService.getSurveyTemplateById(surveyId);

            // Şifreli URL kodu oluştur
            String combined = companyId + ":" + surveyId;
            String encoded = Base64.getEncoder()
                    .encodeToString(combined.getBytes())
                    .replace("+", "-")
                    .replace("/", "_")
                    .replace("=", "");

            // Tam URL oluştur (frontend url'i değişebilir)
            String fullUrl = frontendUrl + "/survey/" + encoded;

            Map<String, Object> response = new HashMap<>();
            response.put("companyName", company.getName());
            response.put("surveyName", surveyTemplate.getName());
            response.put("encodedUrl", encoded);
            response.put("fullUrl", fullUrl);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "URL oluşturulamadı: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}
