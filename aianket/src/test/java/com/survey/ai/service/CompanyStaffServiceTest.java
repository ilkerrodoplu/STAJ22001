package com.survey.ai.service;

import com.survey.ai.dto.InviteCode;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.entity.User;
import com.survey.ai.enums.UserRole;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Çalışan yönetimi yalnızca şirket sahibine açıktır ve yalnızca kendi çalışanlarını kapsar.
 */
class CompanyStaffServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final CompanyRepository companyRepository = mock(CompanyRepository.class);
    private final SecurityService securityService = mock(SecurityService.class);
    private final SurveyTemplateRepository surveyTemplateRepository = mock(SurveyTemplateRepository.class);
    private final SurveyNotificationService notificationService = mock(SurveyNotificationService.class);
    private final CompanyStaffService service = new CompanyStaffService(userRepository, companyRepository,
            securityService, mock(AuditService.class), surveyTemplateRepository, notificationService);

    @Test
    void sahipOlmayan_calisan_yonetemez() {
        assertThatThrownBy(service::listStaff).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(service::getOrCreateInviteCode).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.assignRole("u1", "SURVEY_EDITOR"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void kayitKodu_yoksa_uretilir_ve_suresiyle_birlikte_doner() {
        Company company = sahipOturumu();

        var inviteCode = service.getOrCreateInviteCode();

        assertThat(inviteCode.getCode()).hasSize(8);
        assertThat(inviteCode.getExpiresInSeconds()).isEqualTo(InviteCode.TTL_SECONDS);
        assertThat(company.getInviteCode()).isEqualTo(inviteCode.getCode());
        verify(companyRepository).save(company);
    }

    /** Süresi dolan kod okunduğunda yenilenir; eski kodla kayıt kapanır. */
    @Test
    void suresiDolan_kayitKodu_okunurken_yenilenir() {
        Company company = sahipOturumu();
        company.setInviteCode("ESKIKOD1");
        company.setInviteCodeUpdatedAt(LocalDateTime.now()
                .minusSeconds(InviteCode.TTL_SECONDS + 1));

        var inviteCode = service.getOrCreateInviteCode();

        assertThat(inviteCode.getCode()).isNotEqualTo("ESKIKOD1");
        assertThat(company.getInviteCode()).isEqualTo(inviteCode.getCode());
    }

    /** Süresi dolmayan kod her istekte değişmemeli. */
    @Test
    void gecerli_kayitKodu_aynen_doner() {
        Company company = sahipOturumu();
        company.setInviteCode("GECERLI1");
        company.setInviteCodeUpdatedAt(LocalDateTime.now());

        assertThat(service.getOrCreateInviteCode().getCode()).isEqualTo("GECERLI1");
        verify(companyRepository, never()).save(any());
    }

    @Test
    void calisana_rol_atanir_sahiplik_rolu_verilemez() {
        sahipOturumu();
        User staff = calisan("u1", "sirket-1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(staff));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        assertThat(service.assignRole("u1", "SURVEY_EDITOR").getRoles())
                .containsExactly(UserRole.SURVEY_EDITOR.name());

        assertThatThrownBy(() -> service.assignRole("u1", "COMPANY_OWNER"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.assignRole("u1", "ADMIN"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void baskaSirketin_calisanina_rol_atanamaz() {
        sahipOturumu();
        when(userRepository.findById("u2")).thenReturn(Optional.of(calisan("u2", "baska-sirket")));

        assertThatThrownBy(() -> service.assignRole("u2", "SURVEY_EDITOR"))
                .isInstanceOf(AccessDeniedException.class);
        verify(userRepository, never()).save(any());
    }

    /** Çıkarılan çalışanın hesabı silinmez/kapatılmaz: yeni şirkete katılabilmeli. */
    @Test
    void cikarilanCalisanin_sirket_bagi_kopar_hesabi_acik_kalir() {
        sahipOturumu();
        User staff = calisan("u1", "sirket-1");
        staff.setStatus("ACTIVE");
        when(userRepository.findById("u1")).thenReturn(Optional.of(staff));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        service.removeStaff("u1");

        assertThat(staff.getCompanyId()).isNull();
        assertThat(staff.getRoles()).isEmpty();
        assertThat(staff.getMembershipStatus()).isNull();
        assertThat(staff.getStatus()).isEqualTo("ACTIVE");
        assertThat(staff.getDeactivatedAt()).isNull();
    }

    /** Çalışanın hazırladığı anket şirkette kalır; sahipliği şirket sahibine geçer. */
    @Test
    void cikarilanCalisanin_anketleri_sirkete_kalir() {
        sahipOturumu();
        when(securityService.getCurrentUserId()).thenReturn("sahip-1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(calisan("u1", "sirket-1")));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        SurveyTemplate calisanin = new SurveyTemplate();
        calisanin.setCompanyId("sirket-1");
        calisanin.setCreatedBy("u1");
        SurveyTemplate baskasinin = new SurveyTemplate();
        baskasinin.setCompanyId("sirket-1");
        baskasinin.setCreatedBy("u2");
        when(surveyTemplateRepository.findByCompanyId("sirket-1"))
                .thenReturn(List.of(calisanin, baskasinin));

        service.removeStaff("u1");

        assertThat(calisanin.getCreatedBy()).isEqualTo("sahip-1");
        assertThat(baskasinin.getCreatedBy()).isEqualTo("u2");
        verify(surveyTemplateRepository).saveAll(List.of(calisanin));
    }

    @Test
    void onaylanan_calisan_panelini_gorur_reddedilenin_bagi_kopar() {
        sahipOturumu();
        User bekleyen = calisan("u1", "sirket-1");
        bekleyen.setMembershipStatus("PENDING");
        when(userRepository.findById("u1")).thenReturn(Optional.of(bekleyen));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        assertThat(service.approveStaff("u1").getMembershipStatus()).isEqualTo("APPROVED");

        service.rejectStaff("u1");
        assertThat(bekleyen.getCompanyId()).isNull();
        assertThat(bekleyen.getMembershipStatus()).isNull();
        assertThat(bekleyen.getStatus()).isNotEqualTo("INACTIVE");
    }

    /** Şirketsiz kullanıcı yalnızca kayıt koduyla katılır ve yine onay bekler. */
    @Test
    void sirketsiz_kullanici_kayit_koduyla_katilir_ve_onay_bekler() {
        Company hedef = new Company();
        hedef.setId("sirket-2");
        hedef.setInviteCode("KATILIM1");
        hedef.setInviteCodeUpdatedAt(LocalDateTime.now());
        when(companyRepository.findByInviteCode("KATILIM1")).thenReturn(Optional.of(hedef));

        User sirketsiz = calisan("u9", null);
        sirketsiz.setRoles(new java.util.HashSet<>());
        when(securityService.getCurrentUser()).thenReturn(Optional.of(sirketsiz));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var sonuc = service.join(" katilim1 ");

        assertThat(sonuc.getCompanyId()).isEqualTo("sirket-2");
        assertThat(sonuc.getMembershipStatus()).isEqualTo("PENDING");
        assertThat(sonuc.getRoles()).containsExactly(UserRole.COMPANY_STAFF.name());
        assertThat(hedef.getInviteCodeUses()).isEqualTo(1);
        verify(notificationService).notifyJoinRequest("sirket-2", sirketsiz);
    }

    @Test
    void sirketi_olan_kullanici_baska_sirkete_katilamaz() {
        when(securityService.getCurrentUser()).thenReturn(Optional.of(calisan("u1", "sirket-1")));

        assertThatThrownBy(() -> service.join("KATILIM1")).isInstanceOf(IllegalStateException.class);
        verify(userRepository, never()).save(any());
    }

    /** Süresi dolmuş kodla katılım kabul edilmez. */
    @Test
    void suresi_dolmus_kodla_katilinamaz() {
        Company hedef = new Company();
        hedef.setId("sirket-2");
        hedef.setInviteCodeUpdatedAt(LocalDateTime.now().minusSeconds(InviteCode.TTL_SECONDS + 1));
        when(companyRepository.findByInviteCode("ESKIKOD1")).thenReturn(Optional.of(hedef));

        User sirketsiz = calisan("u9", null);
        when(securityService.getCurrentUser()).thenReturn(Optional.of(sirketsiz));

        assertThatThrownBy(() -> service.join("ESKIKOD1")).isInstanceOf(IllegalStateException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void calisanListesinde_sahip_gorunmez() {
        sahipOturumu();
        User sahip = calisan("u0", "sirket-1");
        sahip.setRoles(Set.of(UserRole.COMPANY_OWNER.name()));
        when(userRepository.findByCompanyId("sirket-1"))
                .thenReturn(List.of(sahip, calisan("u1", "sirket-1")));

        assertThat(service.listStaff()).extracting("id").containsExactly("u1");
    }

    private Company sahipOturumu() {
        Company company = new Company();
        company.setId("sirket-1");
        company.setName("Şirket");
        when(securityService.isCurrentUserCompanyOwner()).thenReturn(true);
        when(securityService.getCurrentUserCompanyId()).thenReturn("sirket-1");
        when(companyRepository.findById("sirket-1")).thenReturn(Optional.of(company));
        return company;
    }

    private User calisan(String id, String companyId) {
        User user = new User();
        user.setId(id);
        user.setEmail(id + "@ornek.com");
        user.setCompanyId(companyId);
        user.setRoles(new java.util.HashSet<>(Set.of(UserRole.COMPANY_STAFF.name())));
        return user;
    }
}
