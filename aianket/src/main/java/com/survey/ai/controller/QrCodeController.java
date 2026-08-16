package com.survey.ai.controller;
 

import com.google.zxing.WriterException;
import com.survey.ai.dto.PublicCompanyView;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.service.QrCodeService;
import com.survey.ai.service.CompanyService;
import com.survey.ai.service.SecurityService;
import com.survey.ai.service.SurveyTemplateService;
import com.survey.ai.util.UrlEncoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/v1/qr-codes")
public class QrCodeController {

    @Autowired
    private QrCodeService qrCodeService;

    @Autowired
    private CompanyService companyService;

    @Autowired
    private SurveyTemplateService surveyTemplateService;

    @Autowired
    private UrlEncoder urlEncoder;

    @Autowired
    private SecurityService securityService;

    /**
     * QR kod oluşturma endpoint'i. Süper adminin QR üretme yetkisi yoktur;
     * QR yalnızca anketin sahibi şirket tarafından paylaşılır.
     */
    @GetMapping("/generate/{companyId}/{surveyId}")
    public ResponseEntity<Map<String, Object>> generateQrCode(
            @PathVariable String companyId,
            @PathVariable String surveyId) {

        if (securityService.isCurrentUserAdmin()) {
            throw new AccessDeniedException("Süper admin QR kod üretemez");
        }

        try {
            // Restoran ve anket şablonunu kontrol et
            Company company = companyService.getCompanyById(companyId);
            SurveyTemplate template = surveyTemplateService.getSurveyTemplateById(surveyId);

            // QR kodu oluştur
            Map<String, String> qrCodeInfo = qrCodeService.generateQrCode(companyId, surveyId);

            // Yanıt hazırla
            Map<String, Object> response = new HashMap<>();
            response.put("company", company.getName());
            response.put("surveyTemplate", template.getName());
            response.put("qrCodeImage", qrCodeInfo.get("qrCodeBase64"));
            response.put("surveyUrl", qrCodeInfo.get("surveyUrl"));
            response.put("encodedData", qrCodeInfo.get("encodedData"));

            return ResponseEntity.ok(response);
        } catch (WriterException | IOException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "QR kod oluşturulamadı: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Şifreli anket URL bilgilerini getirme endpoint'i
     */
    @GetMapping("/survey-info/{encodedData}")
    public ResponseEntity<Map<String, Object>> getSurveyInfo(@PathVariable String encodedData) {
        try {
            // Şifreli kodu çöz
            String[] decodedIds = urlEncoder.decodeIds(encodedData);
            if (decodedIds.length != 2) {
                throw new IllegalArgumentException("Geçersiz kod formatı");
            }

            String companyId = decodedIds[0];
            String surveyId = decodedIds[1];

            // Restoran ve anket şablonunu getir
            Company company = companyService.getCompanyById(companyId);
            SurveyTemplate template = surveyTemplateService.getSurveyTemplateById(surveyId);

            // Uç oturumsuzdur: şirketin tamamı değil, anket sayfasının gerçekten
            // kullandığı alanlar döner (bkz. PublicCompanyView).
            Map<String, Object> response = new HashMap<>();
            response.put("company", PublicCompanyView.from(company));
            response.put("surveyTemplate", template);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Geçersiz anket kodu: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
}

