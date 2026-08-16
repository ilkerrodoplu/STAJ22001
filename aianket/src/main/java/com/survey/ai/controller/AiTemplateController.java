package com.survey.ai.controller;

import com.survey.ai.entity.SurveyQuestion;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.service.SurveyTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;

@RestController
@RequestMapping("/v1/ai/survey-templates")
@Tag(name = "AI Anket Şablonları", description = "AI tarafından önerilen hızlı anket şablonu oluşturma")
public class AiTemplateController {

    private final SurveyTemplateService surveyTemplateService;

    // Java 17: Constructor injection (daha güvenli/test edilebilir)
    public AiTemplateController(SurveyTemplateService surveyTemplateService) {
        this.surveyTemplateService = surveyTemplateService;
    }

    /**
     * Örnek çağrı:
     * GET /v1/ai/survey-templates/create?name=Çay%20Servis%20Kalitesi&q1=Çay%20sıcaklığı&q2=Çay%20lezzeti&q3=Servis%20hızı&q4=Görüş%20ve%20önerileriniz&companyId=68a48840d8b1d935a55c4982&active=true
     */
    @Operation(
            summary = "Query parametreleri ile hızlı şablon oluştur (AI aksiyon linki)",
            description = "AI'nın oluşturduğu aksiyon linkinden gelen parametreleri kullanarak SurveyTemplate kaydeder."
    )
    @GetMapping(path = "/create")
    public ResponseEntity<SurveyTemplate> quickCreateTemplate(
            @RequestParam(name = "name") String name,
            @RequestParam(name = "companyId") String companyId,
            @RequestParam(name = "q1") String q1,
            @RequestParam(name = "q2") String q2,
            @RequestParam(name = "q3") String q3,
            @RequestParam(name = "q4") String q4,
            @RequestParam(name = "active", required = false, defaultValue = "true") boolean active
    ) {
        // 1) Template gövdesini hazırla
        var template = new SurveyTemplate();
        template.setName(name);
        template.setDescription("AI tarafından önerilen hızlı anket");
        template.setCompanyId(companyId);
        template.setActive(active);

        // 2) Soruları derle
        var questions = new ArrayList<SurveyQuestion>(4);
        questions.add(q(q1, "RATING", 0)); // enum ise: QuestionType.RATING
        questions.add(q(q2, "RATING", 1));
        questions.add(q(q3, "RATING", 2));
        questions.add(q(q4, "TEXT", 3));
        template.setQuestions(questions);

        // 3) Kaydet ve yanıtla
        var saved = surveyTemplateService.saveSurveyTemplate(template);
        // Not: GET ile oluşturma semantiği REST'e aykırıdır; yine de 201 dönüyoruz.
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    // Yardımcı fabrika metodu: tekrarları azaltır, tip güvenli ve okunabilir.
    private static SurveyQuestion q(String text, String type, int displayOrder) {
        var question = new SurveyQuestion();
        question.setId(null);
        question.setText(text);
        question.setRequired(false);
        question.setType(type); // enum ise: question.setType(QuestionType.valueOf(type))
        question.setDisplayOrder(displayOrder);
        return question;
    }
}