package com.survey.ai.service;

import com.survey.ai.dto.ChoiceBreakdownDTO;
import com.survey.ai.entity.SurveyQuestion;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SurveyResponseRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Şıklı sorularda hangi şıkkın daha çok tercih edildiği: en çok seçilen şık başta.
 */
class SurveyReportServiceTest {

    private static final String SORU = "Bizi nereden duydunuz?";

    private final SurveyResponseRepository responseRepository = mock(SurveyResponseRepository.class);
    private final CompanyRepository companyRepository = mock(CompanyRepository.class);
    private final SurveyTemplateRepository templateRepository = mock(SurveyTemplateRepository.class);
    private final SurveyReportService service = new SurveyReportService(responseRepository, companyRepository,
            templateRepository);

    @Test
    void sikDagilimi_enCokTercihEdileni_basa_alir_ve_yuzde_hesaplar() {
        when(responseRepository.findBySurveyTemplateIdAndSubmissionDateBetween(any(), any(), any()))
                .thenReturn(List.of(
                        yanit("Bizi nereden duydunuz?", "Reklam"),
                        yanit("Bizi nereden duydunuz?", "Arkadaş"),
                        yanit("Bizi nereden duydunuz?", "Arkadaş"),
                        yanit("Bizi nereden duydunuz?", "Arkadaş"),
                        yanitSiksiz()));

        List<ChoiceBreakdownDTO> dagilim = service.getChoiceBreakdown("t1", LocalDate.now().getYear());

        assertThat(dagilim).hasSize(1);
        assertThat(dagilim.get(0).getTotalAnswers()).isEqualTo(4);
        assertThat(dagilim.get(0).getOptions()).extracting(ChoiceBreakdownDTO.ChoiceCount::getOption)
                .containsExactly("Arkadaş", "Reklam");
        assertThat(dagilim.get(0).getOptions().get(0).getPercentage()).isEqualTo(75.0);
    }

    @Test
    void siksiz_ankette_bolum_bos_doner() {
        when(responseRepository.findBySurveyTemplateIdAndSubmissionDateBetween(any(), any(), any()))
                .thenReturn(List.of(yanitSiksiz()));

        assertThat(service.getChoiceBreakdown("t1", LocalDate.now().getYear())).isEmpty();
    }

    /** choices alanından önceki yanıtlarda şık yoruma yazılıyordu; onlar da sayılmalı. */
    @Test
    void eskiYanitlarda_sik_yorumdan_okunur_serbest_metin_sik_sayilmaz() {
        sablonSikliSoru(SORU, List.of("Reklam", "Arkadaş"));
        when(responseRepository.findBySurveyTemplateIdAndSubmissionDateBetween(any(), any(), any()))
                .thenReturn(List.of(
                        eskiYanit(SORU + ": Arkadaş\n\nYemekler çok güzeldi: özellikle tatlılar"),
                        eskiYanit(SORU + ": Reklam"),
                        eskiYanit(SORU + ": Gazete"),          // şablonda olmayan şık sayılmaz
                        eskiYanit("Servis nasıldı: hızlıydı"), // serbest metin sayılmaz
                        yanit(SORU, "Arkadaş")));              // yeni kayıt da aynı soruya eklenir

        List<ChoiceBreakdownDTO> dagilim = service.getChoiceBreakdown("t1", LocalDate.now().getYear());

        assertThat(dagilim).hasSize(1);
        assertThat(dagilim.get(0).getTotalAnswers()).isEqualTo(3);
        assertThat(dagilim.get(0).getOptions())
                .extracting(ChoiceBreakdownDTO.ChoiceCount::getOption, ChoiceBreakdownDTO.ChoiceCount::getCount)
                .containsExactly(tuple("Arkadaş", 2L), tuple("Reklam", 1L));
    }

    /**
     * Şirketsiz çağrı hiçbir zaman tüm platformun yanıtlarını döndürmemeli.
     * Eskiden findAll() çalışıyordu: rapor ucundan companyId parametresini silen
     * herhangi bir şirket kullanıcısı bütün şirketlerin verisini okuyabiliyordu.
     */
    @Test
    void companyIdsiz_rapor_cagrisi_tum_sirketlerin_verisini_dondurmez() {
        for (String companyId : new String[] {null, "", "   "}) {
            assertThat(service.getAllResponses(companyId)).isEmpty();
            assertThat(service.getAllResponseWithSurveyTemplateId(companyId, "t1")).isEmpty();
            assertThat(service.getGeneralAverage(companyId)).isZero();
        }
        verify(responseRepository, never()).findAll();
    }

    private void sablonSikliSoru(String soru, List<String> siklar) {
        SurveyQuestion question = new SurveyQuestion();
        question.setText(soru);
        question.setType("MULTIPLE_CHOICE");
        question.setOptions(siklar);

        SurveyTemplate template = new SurveyTemplate();
        template.setQuestions(List.of(question));
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template));
    }

    private SurveyResponse eskiYanit(String yorum) {
        SurveyResponse response = new SurveyResponse();
        response.setComment(yorum);
        return response;
    }

    private SurveyResponse yanit(String soru, String sik) {
        SurveyResponse response = new SurveyResponse();
        response.setChoices(Map.of(soru, sik));
        return response;
    }

    private SurveyResponse yanitSiksiz() {
        SurveyResponse response = new SurveyResponse();
        response.setRatings(Map.of("Memnun kaldınız mı?", 5));
        return response;
    }
}
