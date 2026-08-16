package com.survey.ai.controller;

import com.survey.ai.dto.PublicSurveyTemplateView;
import com.survey.ai.entity.SurveyQuestion;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.service.SurveyTemplateService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Oturumsuz uç yalnızca yayındaki anketi vermeli. /v1/survey-templates
 * bilerek oturuma kapalı (bkz. SecurityConfig); burası o kuralı gevşetmeden
 * QR ile gelen katılımcıya hizmet ediyorsa, pasif ve askıya alınmış anketi
 * sızdırmadığının kanıtı burada durmalı.
 */
class PublicSurveyTemplateControllerTest {

    private final SurveyTemplateService service = mock(SurveyTemplateService.class);
    private final PublicSurveyTemplateController controller = new PublicSurveyTemplateController(service);

    @Test
    void yayindaki_anket_donulur() {
        when(service.getSurveyTemplateById("a1")).thenReturn(template(true, null));

        ResponseEntity<PublicSurveyTemplateView> response = controller.live("a1");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getName()).isEqualTo("Memnuniyet Anketi");
        assertThat(response.getBody().getQuestions()).hasSize(1);
    }

    @Test
    void pasif_anket_410_doner() {
        when(service.getSurveyTemplateById("a1")).thenReturn(template(false, null));

        assertThatThrownBy(() -> controller.live("a1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("410");
    }

    @Test
    void askiya_alinan_anket_410_doner() {
        when(service.getSurveyTemplateById("a1")).thenReturn(template(true, true));

        assertThatThrownBy(() -> controller.live("a1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("410");
    }

    /** Moderasyon notları ve anketi hazırlayan kişi oturumsuz uçtan çıkmaz. */
    @Test
    void yonetim_alanlari_disari_cikmaz() {
        SurveyTemplate template = template(true, null);
        template.setWarningReason("Uygunsuz soru metni");
        template.setWarnedAt(LocalDateTime.now());
        template.setCreatedBy("calisan@firma.com");
        template.setCreatedByName("Çalışan");

        PublicSurveyTemplateView view = PublicSurveyTemplateView.from(template);

        assertThat(view).hasNoNullFieldsOrPropertiesExcept("description");
        assertThat(view.toString())
                .doesNotContain("Uygunsuz soru metni")
                .doesNotContain("calisan@firma.com")
                .doesNotContain("Çalışan");
    }

    private SurveyTemplate template(Boolean active, Boolean suspended) {
        SurveyTemplate template = new SurveyTemplate();
        template.setId("a1");
        template.setName("Memnuniyet Anketi");
        template.setCompanyId("f1");
        template.setStatus("ACTIVE");
        template.setActive(active);
        template.setSuspendedByAdmin(suspended);
        template.setQuestions(List.of(
                new SurveyQuestion("s1", "Hizmetten memnun kaldınız mı?", 0, "RATING", true)));
        return template;
    }
}
