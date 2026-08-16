package com.survey.ai.service;

import com.survey.ai.dto.SiteContentDto;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.SiteSetting;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.entity.User;
import com.survey.ai.enums.UserRole;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SiteSettingRepository;
import com.survey.ai.repository.SurveyResponseRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Uyarılan anket hemen yayından kalkar; 1 hafta içinde düzeltilmezse silinir,
 * düzeltilirse silinmez ve süper adminin onayını bekler.
 */
class SuperAdminServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final CompanyRepository companyRepository = mock(CompanyRepository.class);
    private final SurveyTemplateRepository templateRepository = mock(SurveyTemplateRepository.class);
    private final SurveyResponseRepository responseRepository = mock(SurveyResponseRepository.class);
    private final SiteSettingRepository siteSettingRepository = mock(SiteSettingRepository.class);
    private final EmailService emailService = mock(EmailService.class);
    private final SurveyNotificationService notificationService = mock(SurveyNotificationService.class);
    private final SupportMessageService supportMessageService = mock(SupportMessageService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final SuperAdminService service = new SuperAdminService(userRepository, companyRepository,
            templateRepository, responseRepository, siteSettingRepository, emailService,
            notificationService, supportMessageService, auditService);

    /**
     * Süper admin yalnızca iletişim bilgisini değiştirdiğinde sözleşme metinleri
     * uçmamalı: gönderilmeyen alan silinmez, olduğu gibi korunur.
     */
    @Test
    void siteMetinlerinde_gonderilmeyen_alan_korunur() {
        SiteSetting mevcut = new SiteSetting();
        mevcut.setPrivacyPolicy("Eski gizlilik metni");
        mevcut.setTermsOfService("Eski şartlar");
        when(siteSettingRepository.findById(SiteSetting.SINGLETON_ID)).thenReturn(Optional.of(mevcut));
        when(siteSettingRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        SiteContentDto sonuc = service.updateSiteContent(SiteContentDto.builder()
                .contactInfo("destek@ornek.com")
                .build());

        assertThat(sonuc.getContactInfo()).isEqualTo("destek@ornek.com");
        assertThat(sonuc.getPrivacyPolicy()).isEqualTo("Eski gizlilik metni");
        assertThat(sonuc.getTermsOfService()).isEqualTo("Eski şartlar");
        assertThat(sonuc.getUpdatedAt()).isNotNull();
        verify(auditService).record(eq(AuditService.SITE_CONTENT_UPDATED), any(), any());
    }

    /** Hiç kaydedilmemiş sitede uç hata vermez, boş metinlerle döner. */
    @Test
    void siteMetinleri_hic_kaydedilmemisse_bos_doner() {
        when(siteSettingRepository.findById(SiteSetting.SINGLETON_ID)).thenReturn(Optional.empty());

        assertThat(service.siteContent().getPrivacyPolicy()).isNull();
    }

    @Test
    void uyarilanAnket_hemen_yayindan_kalkar_ve_sahibine_mesaj_gider() {
        SurveyTemplate template = anket("t1", null, LocalDateTime.now().minusDays(3));
        template.setCompanyId("s1");
        template.setActive(true);
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template));
        when(templateRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.warnSurvey("t1", "uygunsuz içerik");

        assertThat(template.getActive()).isFalse();
        assertThat(template.getWarnedAt()).isNotNull();
        // Düzeltme kontrolü updatedAt > warnedAt olduğundan uyarı updatedAt'i ileri almamalı.
        assertThat(template.getUpdatedAt()).isBefore(template.getWarnedAt());
        verify(supportMessageService).systemMessage(eq("s1"), eq(true), contains("uygunsuz içerik"), any());
    }

    @Test
    void suresiDolan_duzeltilmemis_anket_silinir_duzeltilen_kalir() {
        LocalDateTime uyariAni = LocalDateTime.now().minusDays(SuperAdminService.WARNING_GRACE_DAYS + 1);

        SurveyTemplate duzeltilmemis = anket("silinecek", uyariAni, uyariAni.minusHours(1));
        SurveyTemplate duzeltilmis = anket("kalacak", uyariAni, uyariAni.plusDays(1));
        when(templateRepository.findByWarnedAtBefore(any()))
                .thenReturn(List.of(duzeltilmemis, duzeltilmis));

        service.deleteUnfixedWarnedSurveys();

        ArgumentCaptor<List<SurveyTemplate>> captor = ArgumentCaptor.forClass(List.class);
        verify(templateRepository).deleteAll(captor.capture());
        assertThat(captor.getValue()).extracting("id").containsExactly("silinecek");
    }

    @Test
    void suresiDolmayan_anket_silinmez() {
        when(templateRepository.findByWarnedAtBefore(any())).thenReturn(List.of());

        service.deleteUnfixedWarnedSurveys();

        verify(templateRepository, never()).deleteAll(any());
    }

    @Test
    void onaylanan_anket_yeniden_yayina_girer_ve_uyari_kalkar() {
        SurveyTemplate template = anket("t1", LocalDateTime.now().minusDays(1), LocalDateTime.now());
        template.setCompanyId("s1");
        template.setActive(false);
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template));
        when(templateRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.approveSurvey("t1");

        assertThat(template.getActive()).isTrue();
        assertThat(template.getWarnedAt()).isNull();
        assertThat(template.isSuspendedByAdmin()).isFalse();
    }

    @Test
    void sahiplikDevri_eskiSahibi_calisana_indirir_yeniSahibi_yukseltir() {
        Company sirket = sirket("s1");
        User eskiSahip = kullanici("u1", "s1", UserRole.COMPANY_OWNER);
        User yeniSahip = kullanici("u2", "s1", UserRole.SURVEY_EDITOR);

        when(companyRepository.findById("s1")).thenReturn(Optional.of(sirket));
        when(userRepository.findById("u2")).thenReturn(Optional.of(yeniSahip));
        when(userRepository.findByCompanyIdAndRole("s1", UserRole.COMPANY_OWNER.name()))
                .thenReturn(List.of(eskiSahip));

        service.transferOwnership("s1", "u2", null);

        assertThat(yeniSahip.getRoles()).containsExactly(UserRole.COMPANY_OWNER.name());
        assertThat(eskiSahip.getRoles()).containsExactly(UserRole.COMPANY_STAFF.name());
    }

    /** "Diğer" seçeneği: listede olmayan kişi e-postasıyla sahip yapılır ve şirkete taşınır. */
    @Test
    void epostayla_verilen_kullanici_sirkete_tasinip_sahip_yapilir() {
        when(companyRepository.findById("s1")).thenReturn(Optional.of(sirket("s1")));
        User baskaSirkettenCalisan = kullanici("u9", "baska-sirket", UserRole.COMPANY_STAFF);
        when(userRepository.findByEmail("u9@firma.com")).thenReturn(Optional.of(baskaSirkettenCalisan));

        service.transferOwnership("s1", null, " u9@firma.com ");

        assertThat(baskaSirkettenCalisan.getCompanyId()).isEqualTo("s1");
        assertThat(baskaSirkettenCalisan.getRoles()).containsExactly(UserRole.COMPANY_OWNER.name());
    }

    @Test
    void baskaSirketin_sahibi_devralamaz_o_sirket_sahipsiz_kalmasin() {
        when(companyRepository.findById("s1")).thenReturn(Optional.of(sirket("s1")));
        when(userRepository.findByEmail("u9@firma.com"))
                .thenReturn(Optional.of(kullanici("u9", "baska-sirket", UserRole.COMPANY_OWNER)));

        assertThatThrownBy(() -> service.transferOwnership("s1", null, "u9@firma.com"))
                .isInstanceOf(IllegalArgumentException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void bilinmeyen_eposta_icin_devir_yapilmaz() {
        when(companyRepository.findById("s1")).thenReturn(Optional.of(sirket("s1")));
        when(userRepository.findByEmail("yok@firma.com")).thenReturn(Optional.empty());
        when(userRepository.findAll()).thenReturn(List.of());

        assertThatThrownBy(() -> service.transferOwnership("s1", null, "yok@firma.com"))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void sirketDondurulunca_aktif_kullanicilari_da_dondurulur_pasifler_korunur() {
        Company sirket = sirket("s1");
        User aktif = kullanici("u1", "s1", UserRole.COMPANY_OWNER);
        User kendiKapatmis = kullanici("u2", "s1", UserRole.COMPANY_STAFF);
        kendiKapatmis.setStatus("INACTIVE");

        when(companyRepository.findById("s1")).thenReturn(Optional.of(sirket));
        when(userRepository.findByCompanyId("s1")).thenReturn(List.of(aktif, kendiKapatmis));

        service.changeCompanyStatus("s1", true);

        assertThat(sirket.isSuspended()).isTrue();
        assertThat(aktif.getStatus()).isEqualTo(Company.SUSPENDED);
        assertThat(kendiKapatmis.getStatus()).isEqualTo("INACTIVE");
    }

    private Company sirket(String id) {
        Company company = new Company();
        company.setId(id);
        company.setName("Firma " + id);
        company.setStatus("ACTIVE");
        return company;
    }

    /** Anketin sahibi onu hazırlayan kişidir; şirket sahibi varsayılmaz. */
    @Test
    void anketinSahibi_hazirlayan_kullanicidir() {
        User sahip = kullanici("u1", "s1", UserRole.COMPANY_OWNER);
        User calisan = kullanici("u2", "s1", UserRole.SURVEY_EDITOR);
        when(userRepository.findByRole(UserRole.COMPANY_OWNER.name())).thenReturn(List.of(sahip));
        when(userRepository.findAll()).thenReturn(List.of(sahip, calisan));
        when(companyRepository.findAll()).thenReturn(List.of(sirket("s1")));

        SurveyTemplate calisanin = anket("t1", null, null);
        calisanin.setCompanyId("s1");
        calisanin.setCreatedBy("u2");
        // createdBy'si olmayan eski kayıt: şirket sahibine düşer.
        SurveyTemplate eski = anket("t2", null, null);
        eski.setCompanyId("s1");
        when(templateRepository.findAll()).thenReturn(List.of(calisanin, eski));

        assertThat(service.listSurveys()).extracting("id", "ownerEmail")
                .containsExactly(tuple("t1", "u2@firma.com"), tuple("t2", "u1@firma.com"));
    }

    private User kullanici(String id, String companyId, UserRole role) {
        User user = new User();
        user.setId(id);
        user.setEmail(id + "@firma.com");
        user.setCompanyId(companyId);
        user.setStatus("ACTIVE");
        user.setRoles(new HashSet<>(Set.of(role.name())));
        return user;
    }

    private SurveyTemplate anket(String id, LocalDateTime warnedAt, LocalDateTime updatedAt) {
        SurveyTemplate template = new SurveyTemplate();
        template.setId(id);
        template.setWarnedAt(warnedAt);
        template.setUpdatedAt(updatedAt);
        return template;
    }
}
