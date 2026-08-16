package com.survey.ai.controller;

import com.survey.ai.dto.PublicSurveyTemplateView;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.service.SurveyTemplateService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * QR/link ile gelen katılımcının anketi açması.
 * <p>
 * {@code /v1/survey-templates/**} bilerek oturuma kapalıdır (bkz. SecurityConfig):
 * açıkken pasif ve süper adminin askıya aldığı anketler de oturumsuz okunabiliyordu.
 * Bu uç o kuralı gevşetmeden yalnızca YAYINDAKİ anketi döndürür; kontrol artık
 * tarayıcıda değil sunucuda.
 * <p>
 * Yayında olmayan anket 404 değil 410 döner: katılımcıya "karekod eski olabilir"
 * yerine "anket yayında değil" demek gerekiyor.
 * <p>
 * Yöneticinin önizlemesi buradan geçmez; kendi taslağını da görebilmesi için
 * oturumlu {@code /v1/survey-templates/{id}} ucunu kullanır.
 */
@RestController
@RequestMapping("/public/survey-templates")
@RequiredArgsConstructor
@Tag(name = "Anket (herkese açık)", description = "QR ile gelen katılımcının anketi")
public class PublicSurveyTemplateController {

    private final SurveyTemplateService surveyTemplateService;

    @GetMapping("/{id}")
    public ResponseEntity<PublicSurveyTemplateView> live(@PathVariable String id) {
        SurveyTemplate template = surveyTemplateService.getSurveyTemplateById(id);

        if (Boolean.FALSE.equals(template.getActive()) || template.isSuspendedByAdmin()) {
            throw new ResponseStatusException(HttpStatus.GONE, "Anket yayında değil");
        }

        return ResponseEntity.ok(PublicSurveyTemplateView.from(template));
    }
}
