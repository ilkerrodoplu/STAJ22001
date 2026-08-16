package com.survey.ai.service;

import com.survey.ai.entity.Company;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SurveyResponseRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Masa özetindeki olumlu/olumsuz kararı: yorum varsa duygu analizi,
 * yoksa puan ortalaması belirler. Ayrıca QR ile gelen oturumsuz yanıtın
 * hangi şirkete yazılacağı istemciye bırakılmaz.
 */
class SurveyResponseServiceTest {

    @SuppressWarnings("unchecked")
    private final KafkaTemplate<String, SurveyResponse> kafkaTemplate = mock(KafkaTemplate.class);
    private final SurveyResponseRepository responseRepository = mock(SurveyResponseRepository.class);
    private final SurveyTemplateRepository templateRepository = mock(SurveyTemplateRepository.class);
    private final CompanyRepository companyRepository = mock(CompanyRepository.class);
    private final SurveyNotificationService notificationService = mock(SurveyNotificationService.class);
    private final SurveyResponseService service = new SurveyResponseService(
            responseRepository, templateRepository, companyRepository, kafkaTemplate, notificationService);

    @Test
    void yanitinSirketi_istemciden_degil_sablondan_alinir() {
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template("dogru-firma", true)));
        when(responseRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        SurveyResponse response = new SurveyResponse();
        response.setSurveyTemplateId("t1");
        response.setCompanyId("baska-firma"); // istemcinin gönderdiği değer

        assertThat(service.saveSurveyResponse(response).getCompanyId()).isEqualTo("dogru-firma");
    }

    @Test
    void yorumsuz_yanit_da_duygu_analizine_gonderilir_yildizlar_sozel_gider() {
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template("firma", true)));
        when(responseRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        SurveyResponse response = new SurveyResponse();
        response.setSurveyTemplateId("t1");
        response.setRatings(Map.of("Lezzet", 5, "Servis", 3, "Ortam", 4));

        SurveyResponse saved = service.saveSurveyResponse(response);

        assertThat(saved.getRatingScore()).isEqualTo(12.0);   // 5+3+4 = 12/15
        assertThat(saved.getSentiment()).isEqualTo("positive");

        ArgumentCaptor<SurveyResponse> mesaj = ArgumentCaptor.forClass(SurveyResponse.class);
        verify(kafkaTemplate).send(eq("customer-comments"), mesaj.capture());
        assertThat(mesaj.getValue().getComment())
                .isEqualTo("Lezzet: çok iyi\nOrtam: iyi\nServis: nötr");
        // Kayıttaki yorum bozulmaz; analiz metni yalnızca mesajda.
        assertThat(saved.getComment()).isNull();
    }

    @Test
    void yildizlar_ve_serbest_yorum_birlikte_analize_gider() {
        SurveyResponse response = new SurveyResponse();
        response.setRatings(Map.of("Servis", 1));
        response.setComment("Çok beklettiler.");

        assertThat(SurveyResponseService.analysisText(response))
                .isEqualTo("Servis: çok kötü\nÇok beklettiler.");
    }

    @Test
    void yayindaOlmayanAnkete_yanit_kaydedilmez() {
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template("firma", false)));

        SurveyResponse response = new SurveyResponse();
        response.setSurveyTemplateId("t1");

        assertThatThrownBy(() -> service.saveSurveyResponse(response))
                .isInstanceOf(IllegalStateException.class);
        verify(responseRepository, never()).save(any());
    }

    @Test
    void olmayanSablona_yanit_kaydedilmez() {
        when(templateRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.saveSurveyResponse(new SurveyResponse()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(responseRepository, never()).save(any());
    }

    /**
     * Aynı müşteri anketi gün içinde birden çok kez doldurabilir: ikinci ziyaret
     * ayrı bir deneyimdir. Eski tekrar engeli e-postaya bakıyordu; anket artık
     * e-posta sormadığı için tek bir yanıt bütün müşterileri kilitliyordu.
     */
    @Test
    void ayniAnket_ayniGun_birden_cok_kez_doldurulabilir() {
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template("firma", true)));
        when(responseRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        SurveyResponse ilk = new SurveyResponse();
        ilk.setSurveyTemplateId("t1");
        SurveyResponse ikinci = new SurveyResponse();
        ikinci.setSurveyTemplateId("t1");

        service.saveSurveyResponse(ilk);
        service.saveSurveyResponse(ikinci);

        verify(responseRepository, times(2)).save(any());
    }

    /**
     * Yorum yazılmayan yanıt da şirkete bildirim düşürür ve bu bildirim yanıt
     * kaydedilirken bir kez oluşur; duygu sonucu Kafka'dan dönünce aynı kayıt
     * güncellenir (bkz. SentimentResultListener).
     */
    @Test
    void yorumsuz_yanit_da_sirkete_tek_bildirim_dusurur() {
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template("firma", true)));
        when(responseRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        SurveyResponse response = new SurveyResponse();
        response.setSurveyTemplateId("t1");
        response.setRatings(Map.of("Servis", 4));

        service.saveSurveyResponse(response);

        verify(notificationService, times(1)).saveResponseNotification(any());
    }

    @Test
    void dondurulmusSirketin_anketi_yanit_kabul_etmez() {
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template("firma", true)));

        Company suspended = new Company();
        suspended.setStatus(Company.SUSPENDED);
        when(companyRepository.findById("firma")).thenReturn(Optional.of(suspended));

        SurveyResponse response = new SurveyResponse();
        response.setSurveyTemplateId("t1");

        assertThatThrownBy(() -> service.saveSurveyResponse(response))
                .isInstanceOf(IllegalStateException.class);
        verify(responseRepository, never()).save(any());
    }

    /**
     * Uç anonimdir ve gövde doğrudan entity'ye bağlanır. Gövdedeki id
     * temizlenmezse Mongo save() var olan yanıtın üzerine yazıyordu.
     */
    @Test
    void govdedeki_id_yok_sayilir_mevcut_yanitin_uzerine_yazilamaz() {
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template("firma", true)));
        when(responseRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        SurveyResponse response = new SurveyResponse();
        response.setSurveyTemplateId("t1");
        response.setId("baskasinin-yaniti"); // saldırganın hedef aldığı kayıt
        response.setRatings(Map.of("Lezzet", 5));

        service.saveSurveyResponse(response);

        ArgumentCaptor<SurveyResponse> kaydedilen = ArgumentCaptor.forClass(SurveyResponse.class);
        verify(responseRepository).save(kaydedilen.capture());
        assertThat(kaydedilen.getValue().getId()).isNull();
    }

    /**
     * Yıldız gönderilmediğinde puan değerlendirmesi çalışmıyor; istemcinin
     * yazdığı duygu değeri temizlenmezse olduğu gibi kaydedilip raporları
     * zehirliyordu.
     */
    @Test
    void istemcinin_yazdigi_duygu_degeri_kaydedilmez() {
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template("firma", true)));
        when(responseRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        SurveyResponse response = new SurveyResponse();
        response.setSurveyTemplateId("t1");
        response.setComment("berbat bir deneyimdi");
        response.setSentiment("positive");   // uydurma
        response.setSentimentScore(1.0);     // uydurma
        response.setRatingScore(15.0);       // uydurma
        response.setName("kurban");          // artık sorulmayan alanlar
        response.setEmail("kurban@example.com");

        SurveyResponse saved = service.saveSurveyResponse(response);

        assertThat(saved.getSentiment()).isNull();
        assertThat(saved.getSentimentScore()).isZero();
        assertThat(saved.getRatingScore()).isNull();
        assertThat(saved.getName()).isNull();
        assertThat(saved.getEmail()).isNull();
    }

    private SurveyTemplate template(String companyId, boolean active) {
        SurveyTemplate template = new SurveyTemplate();
        template.setId("t1");
        template.setCompanyId(companyId);
        template.setActive(active);
        return template;
    }

    @Test
    void duyguAnalizi_varsa_puanlaraBakilmaz() {
        SurveyResponse response = new SurveyResponse();
        response.setSentiment("negative");
        response.setRatings(Map.of("Lezzet", 5));

        assertThat(SurveyResponseService.isPositive(response)).isFalse();
    }

    @Test
    void duyguYoksa_puanEsikleri_kullanilir() {
        // 15'lik skala: 10 ve üstü mükemmel, 6 ve altı kötü, arası ortalama (kararsız).
        SurveyResponse mukemmel = new SurveyResponse();
        mukemmel.setRatings(Map.of("Lezzet", 5, "Servis", 4)); // 13.5

        SurveyResponse kotu = new SurveyResponse();
        kotu.setRatings(Map.of("Lezzet", 2, "Servis", 2)); // 6.0

        SurveyResponse ortalama = new SurveyResponse();
        ortalama.setRatings(Map.of("Lezzet", 4, "Servis", 2)); // 9.0

        assertThat(SurveyResponseService.isPositive(mukemmel)).isTrue();
        assertThat(SurveyResponseService.isPositive(kotu)).isFalse();
        assertThat(SurveyResponseService.isPositive(ortalama)).isNull();
    }

    @Test
    void notrVeVerisiz_yanitlarSayilmaz() {
        SurveyResponse notr = new SurveyResponse();
        notr.setSentiment("neutral");

        assertThat(SurveyResponseService.isPositive(notr)).isNull();
        assertThat(SurveyResponseService.isPositive(new SurveyResponse())).isNull();
    }
}
