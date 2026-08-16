package com.survey.ai.service;

import com.survey.ai.entity.Company;
import com.survey.ai.entity.SurveyNotification;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.entity.User;
import com.survey.ai.enums.UserRole;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SurveyNotificationRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Olumsuz yanıt e-postası: duygu analizi sonucundan sonra, yalnızca gerçekten
 * olumsuz olan yanıt için ve yalnızca şirket sahibine.
 */
class SurveyNotificationServiceTest {

    private final SurveyNotificationRepository notificationRepository = mock(SurveyNotificationRepository.class);
    private final SurveyTemplateRepository templateRepository = mock(SurveyTemplateRepository.class);
    private final CompanyRepository companyRepository = mock(CompanyRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final EmailService emailService = mock(EmailService.class);
    private final SecurityService securityService = mock(SecurityService.class);

    private final SurveyNotificationService service = new SurveyNotificationService(
            notificationRepository, templateRepository, companyRepository, userRepository, emailService,
            securityService);

    /**
     * Kayıt anında puan 9/15 olduğu için duygu "neutral"dı; yorum analizi bunu
     * "negative"e çevirdi. E-posta bu noktada gitmezse hiç gitmiyor.
     */
    @Test
    void yorum_analizi_olumsuza_cevirince_sahibe_e_posta_gider() {
        SurveyTemplate template = new SurveyTemplate();
        template.setName("Kahvaltı Anketi");
        when(templateRepository.findById("t1")).thenReturn(Optional.of(template));

        Company company = new Company();
        company.setName("Veli Kafe");
        when(companyRepository.findById("s1")).thenReturn(Optional.of(company));

        User owner = new User();
        owner.setName("Sahip");
        owner.setEmail("sahip@velikafe.com");
        when(userRepository.findByCompanyIdAndRole("s1", UserRole.COMPANY_OWNER.name()))
                .thenReturn(List.of(owner));

        service.emailOwnerOnNegative(response("s1", "t1", "negative"));

        verify(emailService).sendNewResponseNotification(
                "sahip@velikafe.com", "Sahip", "Veli Kafe", "Kahvaltı Anketi");
    }

    @Test
    void olumlu_yanit_icin_e_posta_gonderilmez() {
        service.emailOwnerOnNegative(response("s1", "t1", "positive"));

        verify(emailService, never()).sendNewResponseNotification(any(), any(), any(), any());
    }

    /** Sahibi olmayan şirkette (henüz atanmamış) gönderim denenmez, hata da vermez. */
    @Test
    void sahibi_olmayan_sirkette_e_posta_denenmez() {
        when(userRepository.findByCompanyIdAndRole(any(), any())).thenReturn(List.of());

        service.emailOwnerOnNegative(response("s1", "t1", "negative"));

        verify(emailService, never()).sendNewResponseNotification(any(), any(), any(), any());
    }

    /**
     * Uçlar bildirimi notificationId ile alıyor, companyId ile değil; bu yüzden
     * CompanyScopeInterceptor devrede değil. Kontrol servisten kalkarsa başka
     * şirketin bildirimi okunabilir/silinebilir hale gelir.
     */
    @Test
    void baska_sirketin_bildirimi_okunamaz_ve_silinemez() {
        when(notificationRepository.findById("b1")).thenReturn(Optional.of(bildirim("baska-firma")));
        when(securityService.isCurrentUserAdmin()).thenReturn(false);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-firmam");

        assertThatThrownBy(() -> service.markAsRead("b1")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.deleteNotification("b1")).isInstanceOf(AccessDeniedException.class);

        verify(notificationRepository, never()).save(any());
        verify(notificationRepository, never()).delete(any());
    }

    @Test
    void kendi_sirketinin_bildirimi_okundu_yapilabilir() {
        when(notificationRepository.findById("b1")).thenReturn(Optional.of(bildirim("benim-firmam")));
        when(securityService.isCurrentUserAdmin()).thenReturn(false);
        when(securityService.getCurrentUserCompanyId()).thenReturn("benim-firmam");
        when(notificationRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        assertThat(service.markAsRead("b1").isRead()).isTrue();
    }

    /** Şirketi olmayan kullanıcı (onay bekleyen/çıkarılan) hiçbir bildirime dokunamaz. */
    @Test
    void sirketsiz_kullanici_bildirime_dokunamaz() {
        when(notificationRepository.findById("b1")).thenReturn(Optional.of(bildirim("bir-firma")));
        when(securityService.isCurrentUserAdmin()).thenReturn(false);
        when(securityService.getCurrentUserCompanyId()).thenReturn(null);

        assertThatThrownBy(() -> service.markAsRead("b1")).isInstanceOf(AccessDeniedException.class);
    }

    private SurveyNotification bildirim(String companyId) {
        SurveyNotification notification = new SurveyNotification();
        notification.setId("b1");
        notification.setCompanyId(companyId);
        return notification;
    }

    private SurveyResponse response(String companyId, String templateId, String sentiment) {
        SurveyResponse response = new SurveyResponse();
        response.setCompanyId(companyId);
        response.setSurveyTemplateId(templateId);
        response.setSentiment(sentiment);
        return response;
    }
}
