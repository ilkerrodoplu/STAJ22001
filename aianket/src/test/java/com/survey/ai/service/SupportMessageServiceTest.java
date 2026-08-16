package com.survey.ai.service;

import com.survey.ai.entity.Company;
import com.survey.ai.entity.User;
import com.survey.ai.enums.UserRole;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SupportMessageRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Şirketten gelen mesaj tüm süper adminlerin gelen kutusuna düşer; e-postadaki
 * bağlantı da alıcının kendi yazışma sayfasını göstermelidir. İki tarafın
 * mesajlaşma sayfası ayrı adreste (/admin/super/messages ve /admin/messages).
 */
class SupportMessageServiceTest {

    private final SupportMessageRepository messageRepository = mock(SupportMessageRepository.class);
    private final CompanyRepository companyRepository = mock(CompanyRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final SecurityService securityService = mock(SecurityService.class);
    private final EmailService emailService = mock(EmailService.class);
    private final SurveyNotificationService notificationService = mock(SurveyNotificationService.class);
    private final SurveyTemplateRepository templateRepository = mock(SurveyTemplateRepository.class);

    private final SupportMessageService service = new SupportMessageService(
            messageRepository, companyRepository, userRepository, securityService,
            emailService, notificationService, templateRepository);

    @Test
    void sirket_mesaji_tum_super_adminlere_e_posta_olarak_gider() {
        User sender = user("sahip@velikafe.com", "Sahip");
        when(securityService.getCurrentUser()).thenReturn(Optional.of(sender));
        when(securityService.getCurrentUserCompanyId()).thenReturn("s1");

        Company company = new Company();
        company.setId("s1");
        company.setName("Veli Kafe");
        when(companyRepository.findById("s1")).thenReturn(Optional.of(company));

        when(userRepository.findByRole(UserRole.ADMIN.name()))
                .thenReturn(List.of(user("admin1@site.com", "Admin Bir"),
                        user("admin2@site.com", "Admin İki")));

        service.sendToAdmin("Anketim neden askıya alındı?", null);

        ArgumentCaptor<String> alicilar = ArgumentCaptor.forClass(String.class);
        verify(emailService, org.mockito.Mockito.times(2)).sendSupportMessageEmail(
                alicilar.capture(), any(), eq("Veli Kafe"), any(), eq(true));
        assertThat(alicilar.getAllValues())
                .containsExactlyInAnyOrder("admin1@site.com", "admin2@site.com");
    }

    /** Site yönetiminin mesajı şirket sahibine gider; bağlantı şirket sayfasıdır. */
    @Test
    void site_yonetiminin_mesaji_sirket_sahibine_gider() {
        Company company = new Company();
        company.setName("Veli Kafe");
        when(companyRepository.findById("s1")).thenReturn(Optional.of(company));
        when(userRepository.findByCompanyIdAndRole("s1", UserRole.COMPANY_OWNER.name()))
                .thenReturn(List.of(user("sahip@velikafe.com", "Sahip")));

        service.systemMessage("s1", true, "Anketiniz askıya alındı", null);

        verify(emailService).sendSupportMessageEmail(
                eq("sahip@velikafe.com"), eq("Sahip"), eq("Site Yönetimi"), any(), eq(false));
    }

    /** Sistemden şirket adına düşen mesaj da süper adminlere gider. */
    @Test
    void sistem_mesaji_sirket_adina_ise_adminlere_gider() {
        Company company = new Company();
        company.setName("Veli Kafe");
        when(companyRepository.findById("s1")).thenReturn(Optional.of(company));
        when(userRepository.findByRole(UserRole.ADMIN.name()))
                .thenReturn(List.of(user("admin1@site.com", "Admin Bir")));

        service.systemMessage("s1", false, "Anket düzeltmesi gönderildi", null);

        verify(emailService).sendSupportMessageEmail(
                eq("admin1@site.com"), any(), eq("Veli Kafe"), any(), eq(true));
        verify(emailService, org.mockito.Mockito.never()).sendSupportMessageEmail(
                eq("sahip@velikafe.com"), any(), any(), any(), anyBoolean());
    }

    private User user(String email, String name) {
        User user = new User();
        user.setEmail(email);
        user.setName(name);
        return user;
    }
}
