package com.survey.ai.service;

import com.survey.ai.entity.SurveyQuestion;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Şablonlar şirkete kilitlidir: başka şirket adına şablon açılamaz/değiştirilemez.
 */
class SurveyTemplateServiceTest {

    private final SurveyTemplateRepository repository = mock(SurveyTemplateRepository.class);
    private final SecurityService securityService = mock(SecurityService.class);
    private final SupportMessageService supportMessageService = mock(SupportMessageService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final SurveyNotificationService notificationService = mock(SurveyNotificationService.class);
    private final UserRepository userRepository =
            mock(UserRepository.class);
    private final SurveyTemplateService service = new SurveyTemplateService(repository, userRepository,
            securityService, supportMessageService, auditService, notificationService);

    @Test
    void yeniSablon_istemcinin_companyIdsini_dikkate_almaz() {
        when(securityService.canCurrentUserEditSurveys()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-sirketim");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        SurveyTemplate gonderilen = new SurveyTemplate();
        gonderilen.setName("Anket");
        gonderilen.setCompanyId("baska-sirket");

        service.saveSurveyTemplate(gonderilen);

        ArgumentCaptor<SurveyTemplate> captor = ArgumentCaptor.forClass(SurveyTemplate.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getCompanyId()).isEqualTo("benim-sirketim");
    }

    @Test
    void baskaSirketinSablonu_guncellenemez_ve_silinemez() {
        when(securityService.canCurrentUserEditSurveys()).thenReturn(true);
        when(securityService.isCurrentUserCompanyOwner()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-sirketim");

        SurveyTemplate baskasinin = new SurveyTemplate();
        baskasinin.setCompanyId("baska-sirket");
        when(repository.findById("t1")).thenReturn(Optional.of(baskasinin));

        assertThatThrownBy(() -> service.updateSurveyTemplate("t1", new SurveyTemplate()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.deleteSurveyTemplate("t1"))
                .isInstanceOf(AccessDeniedException.class);

        verify(repository, never()).save(any());
    }

    @Test
    void siteAdmini_anket_olusturamaz_duzenleyemez_silemez() {
        // Süper admin denetler, içerik üretmez: uyarı dışında hiçbir yazma işlemi yapamaz.
        when(securityService.isCurrentUserAdmin()).thenReturn(true);
        when(securityService.canCurrentUserEditSurveys()).thenReturn(true);

        SurveyTemplate template = new SurveyTemplate();
        template.setCompanyId("baska-sirket");
        when(repository.findById("t1")).thenReturn(Optional.of(template));

        assertThatThrownBy(() -> service.saveSurveyTemplate(template))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.updateSurveyTemplate("t1", new SurveyTemplate()))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.deleteSurveyTemplate("t1"))
                .isInstanceOf(AccessDeniedException.class);

        verify(repository, never()).save(any());
    }

    /** Silme gerçekten siler: pasife alma değil, kayıt veritabanından kalkar. */
    @Test
    void sahip_anketi_kalici_olarak_siler() {
        when(securityService.isCurrentUserCompanyOwner()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-sirketim");

        SurveyTemplate template = new SurveyTemplate();
        template.setCompanyId("benim-sirketim");
        template.setName("Silinecek anket");
        when(repository.findById("t1")).thenReturn(Optional.of(template));

        service.deleteSurveyTemplate("t1");

        verify(repository).delete(template);
        verify(repository, never()).save(any());
    }

    @Test
    void adminAskiyaAldiysa_sahip_anketi_kendisi_yayina_alamaz() {
        when(securityService.canCurrentUserEditSurveys()).thenReturn(true);
        when(securityService.isCurrentUserCompanyOwner()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-sirketim");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        SurveyTemplate askidaki = new SurveyTemplate();
        askidaki.setCompanyId("benim-sirketim");
        askidaki.setActive(false);
        askidaki.setSuspendedByAdmin(true);
        when(repository.findById("t1")).thenReturn(Optional.of(askidaki));

        SurveyTemplate duzeltme = new SurveyTemplate();
        duzeltme.setActive(true);

        assertThat(service.updateSurveyTemplate("t1", duzeltme).getActive()).isFalse();
    }

    @Test
    void uyariliAnket_duzeltilince_pasif_kalir_ve_adminlere_mesaj_gider() {
        when(securityService.canCurrentUserEditSurveys()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-sirketim");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        SurveyTemplate uyarili = new SurveyTemplate();
        uyarili.setCompanyId("benim-sirketim");
        uyarili.setWarnedAt(java.time.LocalDateTime.now().minusDays(1));
        uyarili.setActive(false);
        when(repository.findById("t1")).thenReturn(Optional.of(uyarili));

        SurveyTemplate duzeltme = new SurveyTemplate();
        duzeltme.setActive(true);

        SurveyTemplate sonuc = service.updateSurveyTemplate("t1", duzeltme);

        // Yayına yalnızca süper admin alır; düzeltme updatedAt'i ilerletir, silinmez.
        assertThat(sonuc.getActive()).isFalse();
        assertThat(sonuc.getUpdatedAt()).isAfter(sonuc.getWarnedAt());
        verify(supportMessageService).systemMessage(eq("benim-sirketim"), eq(false), any(), any());
    }

    @Test
    void editorunOlusturduguAnket_onay_beklemez_sahibe_bildirim_gider() {
        editorOturumu();
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        SurveyTemplate template = new SurveyTemplate();
        template.setName("Yeni anket");

        service.saveSurveyTemplate(template);

        verify(notificationService).notifyCompany(eq("benim-sirketim"), contains("Yeni anket oluşturuldu"),
                any(), eq("/admin/survey-templates"));
    }

    @Test
    void editorunDuzenlemesi_dogrudan_uygulanir_sahibe_bildirim_gider() {
        editorOturumu();
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        SurveyTemplate yayindaki = new SurveyTemplate();
        yayindaki.setCompanyId("benim-sirketim");
        yayindaki.setName("Yayındaki ad");
        when(repository.findById("t1")).thenReturn(Optional.of(yayindaki));

        SurveyTemplate degisiklik = new SurveyTemplate();
        degisiklik.setName("Editörün yeni adı");

        SurveyTemplate sonuc = service.updateSurveyTemplate("t1", degisiklik);

        assertThat(sonuc.getName()).isEqualTo("Editörün yeni adı");
        verify(notificationService).notifyCompany(eq("benim-sirketim"), contains("değişiklik yapıldı"),
                any(), eq("/admin/survey-templates"));
    }

    @Test
    void sahibin_kendi_duzenlemesi_kendisine_bildirilmez() {
        when(securityService.canCurrentUserEditSurveys()).thenReturn(true);
        when(securityService.isCurrentUserCompanyOwner()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-sirketim");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        SurveyTemplate template = new SurveyTemplate();
        template.setName("Anket");

        service.saveSurveyTemplate(template);

        verify(notificationService, never()).notifyCompany(any(), any(), any(), any());
    }

    @Test
    void anketiPaylasan_anket_olusturamaz() {
        // Paylaşan rolü: düzenleme yetkisi yok.
        assertThatThrownBy(() -> service.saveSurveyTemplate(new SurveyTemplate()))
                .isInstanceOf(AccessDeniedException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void soruDegisikligi_islem_kaydina_yazilir() {
        when(securityService.canCurrentUserEditSurveys()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-sirketim");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        SurveyTemplate mevcut = new SurveyTemplate();
        mevcut.setCompanyId("benim-sirketim");
        mevcut.setName("Memnuniyet");
        mevcut.setQuestions(new java.util.ArrayList<>(java.util.List.of(
                new SurveyQuestion("s1", "Yemek nasıldı?", 1, "RATING", true),
                new SurveyQuestion("s2", "Silinecek soru", 2, "TEXT", true))));
        when(repository.findById("t1")).thenReturn(Optional.of(mevcut));

        SurveyTemplate degisiklik = new SurveyTemplate();
        degisiklik.setName("Memnuniyet");
        degisiklik.setQuestions(new java.util.ArrayList<>(java.util.List.of(
                new SurveyQuestion("s1", "Yemekler nasıldı?", 1, "RATING", true),
                new SurveyQuestion(null, "Yeni soru", 3, "TEXT", true))));

        service.updateSurveyTemplate("t1", degisiklik);

        ArgumentCaptor<String> detay = ArgumentCaptor.forClass(String.class);
        verify(auditService).record(eq(AuditService.SURVEY_UPDATED), eq("Memnuniyet"), detay.capture());
        assertThat(detay.getValue())
                .contains("soru değişti: \"Yemek nasıldı?\" → \"Yemekler nasıldı?\"")
                .contains("soru eklendi: \"Yeni soru\"")
                .contains("soru silindi: \"Silinecek soru\"");
    }

    @Test
    void sik_ekleme_ve_silme_islem_kaydinda_adiyla_gorunur() {
        when(securityService.canCurrentUserEditSurveys()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-sirketim");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        SurveyTemplate mevcut = new SurveyTemplate();
        mevcut.setCompanyId("benim-sirketim");
        mevcut.setName("Memnuniyet");
        mevcut.setQuestions(new java.util.ArrayList<>(java.util.List.of(
                soru("s1", "Nasıl ulaştınız?", java.util.List.of("Yürüyerek", "Araçla")))));
        when(repository.findById("t1")).thenReturn(Optional.of(mevcut));

        SurveyTemplate degisiklik = new SurveyTemplate();
        degisiklik.setName("Memnuniyet");
        degisiklik.setQuestions(new java.util.ArrayList<>(java.util.List.of(
                soru("s1", "Nasıl ulaştınız?", java.util.List.of("Yürüyerek", "Otobüsle")))));

        service.updateSurveyTemplate("t1", degisiklik);

        ArgumentCaptor<String> detay = ArgumentCaptor.forClass(String.class);
        verify(auditService).record(eq(AuditService.SURVEY_UPDATED), eq("Memnuniyet"), detay.capture());
        assertThat(detay.getValue())
                .contains("eklenen: \"Otobüsle\"")
                .contains("silinen: \"Araçla\"");
    }

    private static SurveyQuestion soru(String id, String metin, java.util.List<String> siklar) {
        SurveyQuestion question = new SurveyQuestion(id, metin, 1, "MULTIPLE_CHOICE", true);
        question.setOptions(new java.util.ArrayList<>(siklar));
        return question;
    }

    @Test
    void degisiklik_yoksa_islem_kaydi_yazilmaz() {
        when(securityService.canCurrentUserEditSurveys()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-sirketim");
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        SurveyTemplate mevcut = new SurveyTemplate();
        mevcut.setCompanyId("benim-sirketim");
        mevcut.setName("Memnuniyet");
        mevcut.setQuestions(new java.util.ArrayList<>(java.util.List.of(
                new SurveyQuestion("s1", "Yemek nasıldı?", 1, "RATING", true))));
        when(repository.findById("t1")).thenReturn(Optional.of(mevcut));

        SurveyTemplate ayni = new SurveyTemplate();
        ayni.setName("Memnuniyet");
        ayni.setQuestions(new java.util.ArrayList<>(java.util.List.of(
                new SurveyQuestion("s1", "Yemek nasıldı?", 1, "RATING", true))));

        service.updateSurveyTemplate("t1", ayni);

        verify(auditService, never()).record(eq(AuditService.SURVEY_UPDATED), any(), any());
    }

    private void editorOturumu() {
        when(securityService.canCurrentUserEditSurveys()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-sirketim");
    }
}
