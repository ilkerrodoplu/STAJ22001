package com.survey.ai.service;

import com.survey.ai.dto.*;
import com.survey.ai.dto.CompanyDto;
import com.survey.ai.dto.LoginRequest;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.SiteSetting;
import com.survey.ai.entity.User;
import com.survey.ai.enums.CompanyType;
import com.survey.ai.enums.UserRole;
import com.survey.ai.exception.AccountClosedException;
import com.survey.ai.exception.AccountLockedException;
import com.survey.ai.exception.AuthenticationException;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.PasswordResetTokenRepository;
import com.survey.ai.repository.RoleRepository;
import com.survey.ai.repository.SiteSettingRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import com.survey.ai.security.CustomUserDetails;
import com.survey.ai.security.CustomUserDetailsService;
import com.survey.ai.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Kayıt olan kullanıcının rolü (admin değil, şirket sahibi) ve hesap kapatma kuralları.
 */
class AuthServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final CompanyRepository companyRepository = mock(CompanyRepository.class);
    private final SurveyTemplateRepository surveyTemplateRepository = mock(SurveyTemplateRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final CustomUserDetailsService userDetailsService = mock(CustomUserDetailsService.class);
    private final SiteSettingRepository siteSettingRepository = mock(SiteSettingRepository.class);
    private final EmailService emailService = mock(EmailService.class);

    private final AuthService authService = new AuthService(
            mock(AuthenticationManager.class),
            userRepository,
            mock(RoleRepository.class),
            passwordEncoder,
            mock(JwtTokenProvider.class),
            mock(PasswordResetTokenRepository.class),
            emailService,
            userDetailsService,
            companyRepository,
            surveyTemplateRepository,
            siteSettingRepository,
            modelMapper(),
            mock(AuditService.class),
            mock(SurveyNotificationService.class),
            mock(SecurityEventService.class));

    /**
     * @Value alanları testte Spring tarafından doldurulmaz; kilit kuralı bu
     * değerlere bağlı olduğu için elle set edilir (prod varsayılanlarıyla aynı).
     */
    {
        ReflectionTestUtils.setField(authService, "maxLoginAttempts", 5);
        ReflectionTestUtils.setField(authService, "lockMinutes", 15L);
        ReflectionTestUtils.setField(authService, "lockEscalationFactor", 5L);
        ReflectionTestUtils.setField(authService, "maxLockCycles", 3);
    }

    /** Prod ile aynı ayar (ModelMapperConfig). */
    private static ModelMapper modelMapper() {
        ModelMapper modelMapper = new ModelMapper();
        modelMapper.getConfiguration()
                .setMatchingStrategy(MatchingStrategies.STRICT)
                .setFieldMatchingEnabled(true)
                .setFieldAccessLevel(org.modelmapper.config.Configuration.AccessLevel.PRIVATE);
        return modelMapper;
    }

    @Test
    void kayitOlanKullanici_sirketSahibiRolunuAlir() {
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(companyRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userDetailsService.loadUserByUsername(any()))
                .thenAnswer(i -> new CustomUserDetails(companyOwner()));

        UserDto userDto = new UserDto();
        userDto.setFirstName("Ali");
        userDto.setLastName("Veli");
        userDto.setEmail("ali@veli.com");
        userDto.setPassword("Parola123");
        userDto.setPasswordConfirm("Parola123");
        userDto.setPhone("05551112233");

        CompanyDto companyDto = new CompanyDto();
        companyDto.setName("Veli Kafe");
        companyDto.setEmail("info@velikafe.com");
        companyDto.setCompanyType(CompanyType.RESTAURANT_CAFE);

        authService.register(new RegistrationRequest(companyDto, userDto));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getRoles()).containsExactly(UserRole.COMPANY_OWNER.name());
        // Ad ve soyad ayrı kalır; birleştirilirse soyad profilde iki kez görünüyor.
        assertThat(captor.getValue().getName()).isEqualTo("Ali");
        assertThat(captor.getValue().getLastName()).isEqualTo("Veli");
    }

    @Test
    void kayitKoduylaKatilan_calisanRolunuAlir_ve_sirkete_baglanir() {
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userDetailsService.loadUserByUsername(any()))
                .thenAnswer(i -> new CustomUserDetails(companyOwner()));

        Company company = new Company();
        company.setId("c1");
        company.setName("Veli Kafe");
        company.setInviteCodeUpdatedAt(LocalDateTime.now());
        when(companyRepository.findByInviteCode("ABCD2345")).thenReturn(Optional.of(company));

        UserDto userDto = new UserDto();
        userDto.setFirstName("Ayşe");
        userDto.setLastName("Çalışan");
        userDto.setEmail("ayse@velikafe.com");
        userDto.setPassword("Parola123");
        userDto.setPasswordConfirm("Parola123");
        userDto.setPhone("05551112244");

        // Kod küçük harfle girilse de kabul edilir.
        authService.registerEmployee(new EmployeeRegistrationRequest(userDto, "abcd2345"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getRoles()).containsExactly(UserRole.COMPANY_STAFF.name());
        assertThat(captor.getValue().getCompanyId()).isEqualTo("c1");
        // Şirket yalnızca kod kullanım sayacı için kaydedilir; başka alan değişmez.
        verify(companyRepository).save(company);
        assertThat(company.getInviteCodeUses()).isEqualTo(1);
    }

    /** Kod isteğe bağlı: kodsuz kayıtta hesap açılır ama hiçbir şirkete bağlanmaz. */
    @Test
    void kodsuz_kayitta_hesap_acilir_sirkete_baglanmaz() {
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userDetailsService.loadUserByUsername(any()))
                .thenAnswer(i -> new CustomUserDetails(companyOwner()));

        UserDto userDto = new UserDto();
        userDto.setFirstName("Kodsuz");
        userDto.setLastName("Çalışan");
        userDto.setEmail("kodsuz@ornek.com");
        userDto.setPassword("Parola123");
        userDto.setPasswordConfirm("Parola123");
        userDto.setPhone("05551112255");

        authService.registerEmployee(new EmployeeRegistrationRequest(userDto, "  "));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getCompanyId()).isNull();
        assertThat(captor.getValue().getRoles()).isEmpty();
        assertThat(captor.getValue().getMembershipStatus()).isNull();
        assertThat(captor.getValue().getStatus()).isEqualTo("ACTIVE");
        verify(companyRepository, never()).save(any());
    }

    /** Kullanım hakkı dolan kod, süresi dolmasa da kabul edilmez. */
    @Test
    void kullanimHakki_dolan_kayitKoduyla_kayit_yapilamaz() {
        Company company = new Company();
        company.setId("c1");
        company.setInviteCodeUpdatedAt(LocalDateTime.now());
        company.setInviteCodeUses(InviteCode.MAX_USES);
        when(companyRepository.findByInviteCode("ABCD2345")).thenReturn(Optional.of(company));

        UserDto userDto = new UserDto();
        userDto.setEmail("ayse@velikafe.com");

        assertThatThrownBy(() -> authService.registerEmployee(
                new EmployeeRegistrationRequest(userDto, "ABCD2345")))
                .isInstanceOf(IllegalStateException.class);
        verify(userRepository, never()).save(any());
    }

    /** Kayıt kodu kısa ömürlüdür: süresi geçmiş kodla kayıt açılamaz. */
    @Test
    void suresiGecmis_kayitKoduyla_kayit_yapilamaz() {
        Company company = new Company();
        company.setId("c1");
        company.setInviteCodeUpdatedAt(LocalDateTime.now()
                .minusSeconds(InviteCode.TTL_SECONDS + 1));
        when(companyRepository.findByInviteCode("ABCD2345")).thenReturn(Optional.of(company));

        UserDto userDto = new UserDto();
        userDto.setFirstName("Ayşe");
        userDto.setLastName("Çalışan");
        userDto.setEmail("gec@velikafe.com");
        userDto.setPassword("Parola123");
        userDto.setPasswordConfirm("Parola123");
        userDto.setPhone("05551112244");

        assertThatThrownBy(() -> authService.registerEmployee(
                new EmployeeRegistrationRequest(userDto, "ABCD2345")))
                .isInstanceOf(IllegalStateException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void superAdminKoduylaKaydolan_da_superAdmin_olur_ve_sirkete_baglanmaz() {
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userDetailsService.loadUserByUsername(any()))
                .thenAnswer(i -> new CustomUserDetails(companyOwner()));

        SiteSetting setting = new SiteSetting();
        setting.setAdminInviteCode("ADMIN234");
        setting.setAdminInviteCodeUpdatedAt(LocalDateTime.now());
        when(siteSettingRepository.findByAdminInviteCode("ADMIN234")).thenReturn(Optional.of(setting));

        UserDto userDto = new UserDto();
        userDto.setFirstName("Yeni");
        userDto.setLastName("Admin");
        userDto.setEmail("yeni@admin.com");
        userDto.setPassword("Parola123");
        userDto.setPasswordConfirm("Parola123");
        userDto.setPhone("05551112255");

        authService.registerEmployee(new EmployeeRegistrationRequest(userDto, "admin234"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getRoles()).containsExactly(UserRole.ADMIN.name());
        assertThat(captor.getValue().getCompanyId()).isNull();
        verify(companyRepository, never()).findByInviteCode(any());
    }

    @Test
    void superAdmin_hesabini_kapatamaz() {
        User admin = new User();
        admin.setEmail("admin@site.com");
        admin.setPassword("hash");
        admin.setRoles(new java.util.HashSet<>(Set.of(UserRole.ADMIN.name())));
        when(userRepository.findByEmail("admin@site.com")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("Parola123", "hash")).thenReturn(true);

        assertThatThrownBy(() -> authService.closeAccount("admin@site.com", closeRequest("Parola123")))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void gecersizKayitKoduyla_calisan_kaydolamaz() {
        when(companyRepository.findByInviteCode(any())).thenReturn(Optional.empty());

        UserDto userDto = new UserDto();
        userDto.setEmail("ayse@velikafe.com");

        assertThatThrownBy(() -> authService.registerEmployee(
                new EmployeeRegistrationRequest(userDto, "YOKBOYLE")))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void rol_istemciden_gonderilemez() {
        assertThat(Arrays.stream(UserDto.class.getDeclaredFields()).map(Field::getName))
                .doesNotContain("roles");
    }

    @Test
    void aktifAnketiOlanSirketSahibi_hesabiniKapatamaz() {
        givenLoggedInOwner();
        when(surveyTemplateRepository.existsByCompanyIdAndActive("c1", true)).thenReturn(true);

        assertThatThrownBy(() -> authService.closeAccount("ali@veli.com", closeRequest("Parola123")))
                .isInstanceOf(IllegalStateException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void aktifAnketYoksa_hesapSilinmez_oncePasifeAlinir() {
        givenLoggedInOwner();
        when(surveyTemplateRepository.existsByCompanyIdAndActive("c1", true)).thenReturn(false);
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        authService.closeAccount("ali@veli.com", closeRequest("Parola123"));

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("INACTIVE");
        assertThat(captor.getValue().getDeactivatedAt()).isNotNull();
        verify(userRepository, never()).delete(any());
    }

    @Test
    void yanlisSifreyle_hesapKapatilamaz() {
        givenLoggedInOwner();

        assertThatThrownBy(() -> authService.closeAccount("ali@veli.com", closeRequest("YanlisSifre")))
                .isInstanceOf(AuthenticationException.class);

        verify(userRepository, never()).save(any());
    }

    /**
     * Kayıtlı olmayan e-posta, yanlış şifreyle AYNI hatayı vermeli. Eskiden 404
     * "kullanıcı bulunamadı" dönüyordu: şifreyi bilmeyen biri bir e-postanın
     * sistemde kayıtlı olup olmadığını tek istekte öğrenebiliyordu.
     */
    @Test
    void olmayanEposta_ile_yanlisSifre_ayniHatayiVerir() {
        when(userRepository.findByEmail("yok@veli.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(companyOwner()));
        when(passwordEncoder.matches("YanlisParola1", "hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("yok@veli.com", "Parola123")))
                .isInstanceOf(AuthenticationException.class)
                .hasMessage("E-posta veya şifre hatalı");

        assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "YanlisParola1")))
                .isInstanceOf(AuthenticationException.class)
                .hasMessage("E-posta veya şifre hatalı");
    }

    /** Hesabın kapalı olduğu bilgisi ancak doğru şifre girildikten sonra verilir. */
    @Test
    void kapatilmisHesapla_giris_geriAlmaBilgisiyleReddedilir() {
        User closed = companyOwner();
        closed.setStatus("INACTIVE");
        closed.setDeactivatedAt(LocalDateTime.of(2026, 1, 15, 10, 0));
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(closed));
        when(passwordEncoder.matches("Parola123", "hash")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "Parola123")))
                .isInstanceOf(AccountClosedException.class)
                .extracting(e -> ((AccountClosedException) e).getDeleteAt())
                .isEqualTo(LocalDateTime.of(2027, 1, 15, 10, 0));
    }

    /** Şifre bilinmiyorsa hesabın kapalı olduğu da sızmamalı: yine genel hata. */
    @Test
    void kapatilmisHesap_yanlisSifreyle_durumunu_sizdirmaz() {
        User closed = companyOwner();
        closed.setStatus("INACTIVE");
        closed.setDeactivatedAt(LocalDateTime.of(2026, 1, 15, 10, 0));
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(closed));
        when(passwordEncoder.matches("YanlisParola1", "hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "YanlisParola1")))
                .isInstanceOf(AuthenticationException.class)
                .hasMessage("E-posta veya şifre hatalı");
    }

    /* ==================== Hesap kilidi ==================== */

    /**
     * 5. hatalı denemede hesap kilitlenir; sayaç sıfırlanır (kilit açılınca hak
     * yenilenir). Kilidi tetikleyen 5. istek de kilit yanıtını alır: eskiden bu
     * istek sıradan 401 dönüyor, kilit ancak bir sonraki istekte görünüyordu.
     */
    @Test
    void besinci_hatali_denemede_hesap_kilitlenir() {
        User user = companyOwner();
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("YanlisParola1", "hash")).thenReturn(false);

        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "YanlisParola1")))
                    .isInstanceOf(AuthenticationException.class);
        }

        assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "YanlisParola1")))
                .isInstanceOf(AccountLockedException.class);

        assertThat(user.isLoginLocked()).isTrue();
        assertThat(user.getFailedLoginAttempts()).isZero();
    }

    /** Hatalı girişte kalan deneme hakkı yanıtta döner; ekranda gösterilir. */
    @Test
    void hatali_giriste_kalan_deneme_hakki_dondurulur() {
        User user = companyOwner();
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("YanlisParola1", "hash")).thenReturn(false);

        for (int kalan : new int[]{4, 3, 2, 1}) {
            assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "YanlisParola1")))
                    .isInstanceOf(AuthenticationException.class)
                    .extracting(e -> ((AuthenticationException) e).getRemainingAttempts())
                    .isEqualTo(kalan);
        }
    }

    /** Sınıra ulaşılmadan kilit yok; sayaç birikir. */
    @Test
    void sinir_altinda_hesap_kilitlenmez() {
        User user = companyOwner();
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("YanlisParola1", "hash")).thenReturn(false);

        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "YanlisParola1")))
                    .isInstanceOf(AuthenticationException.class);
        }

        assertThat(user.isLoginLocked()).isFalse();
        assertThat(user.getFailedLoginAttempts()).isEqualTo(4);
    }

    /** Doğru şifre sayacı sıfırlar: araya giren tek doğru giriş kilidi öteler. */
    @Test
    void basarili_giris_hatali_deneme_sayacini_sifirlar() {
        User user = companyOwner();
        user.setFailedLoginAttempts(4);
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("YanlisParola1", "hash")).thenReturn(false);
        when(passwordEncoder.matches("Parola123", "hash")).thenReturn(true);
        when(userDetailsService.loadUserByUsername("ali@veli.com")).thenReturn(new CustomUserDetails(user));

        authService.login(new LoginRequest("ali@veli.com", "Parola123"));

        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.isLoginLocked()).isFalse();
    }

    /** Kilitli hesap DOĞRU şifreyle gelirse kilit bilgisi verilir. */
    @Test
    void kilitli_hesap_dogru_sifreyle_kilit_bilgisi_dondurur() {
        User user = companyOwner();
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Parola123", "hash")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "Parola123")))
                .isInstanceOf(AccountLockedException.class);
    }

    /**
     * Kilitli hesap YANLIŞ şifreyle gelirse sıradan hatalı giriş yanıtı döner.
     * Aksi halde "kilitli" cevabı, bir e-postanın sistemde kayıtlı olduğunu
     * dışarıya söyleyen bir sinyal olurdu (kimlik sayımı).
     */
    @Test
    void kilitli_hesap_yanlis_sifreyle_kilitli_oldugunu_sizdirmaz() {
        User user = companyOwner();
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("YanlisParola1", "hash")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "YanlisParola1")))
                .isInstanceOf(AuthenticationException.class)
                .hasMessage("E-posta veya şifre hatalı");
    }

    /** Süresi dolmuş kilit engel değildir; kendiliğinden açılır. */
    @Test
    void suresi_dolmus_kilit_girisi_engellemez() {
        User user = companyOwner();
        user.setLockedUntil(LocalDateTime.now().minusMinutes(1));
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Parola123", "hash")).thenReturn(true);
        when(userDetailsService.loadUserByUsername("ali@veli.com")).thenReturn(new CustomUserDetails(user));

        authService.login(new LoginRequest("ali@veli.com", "Parola123"));

        assertThat(user.getLockedUntil()).isNull();
    }

    /**
     * Her kilitte süre katlanır: 15 -> 75 -> 375 dakika. Sabit süre olsaydı
     * saldırgan her açılışta yeni bir deneme paketi kazanıp sürdürebilirdi.
     */
    @Test
    void her_kilitte_sure_bes_katina_cikar() {
        User user = companyOwner();
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("YanlisParola1", "hash")).thenReturn(false);

        long[] beklenenDakika = {15, 75, 375};
        for (int kilit = 0; kilit < beklenenDakika.length; kilit++) {
            user.setLockedUntil(null); // süre dolmuş say, sıradaki seriye geç
            for (int i = 0; i < 5; i++) {
                assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "YanlisParola1")))
                        .isInstanceOf(RuntimeException.class); // 5.'si kilit, öncekiler 401
            }

            // between() aşağı yuvarlar; ölçüm anındaki saliseler yüzünden bir dakika kayabilir.
            long dakika = ChronoUnit.MINUTES.between(LocalDateTime.now(), user.getLockedUntil());
            assertThat(dakika).isBetween(beklenenDakika[kilit] - 1, beklenenDakika[kilit]);
            assertThat(user.getLockCount()).isEqualTo(kilit + 1);
        }
    }

    /**
     * Süreli kilit hakkı bitince hesap yalnızca şifre sıfırlanınca açılır ve
     * kullanıcıya sıfırlama bağlantısı e-postayla gider.
     */
    @Test
    void kilit_hakki_bitince_hesap_sifre_sifirlanana_kadar_kilitlenir() {
        User user = companyOwner();
        user.setLockCount(3); // son süreli kilit kullanılmış
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("YanlisParola1", "hash")).thenReturn(false);

        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "YanlisParola1")))
                    .isInstanceOf(AuthenticationException.class);
        }

        assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "YanlisParola1")))
                .isInstanceOf(AccountLockedException.class)
                .matches(e -> ((AccountLockedException) e).isUntilPasswordReset());

        assertThat(user.isLockedUntilPasswordReset()).isTrue();
        assertThat(user.getLockedUntil()).isNull();
        assertThat(user.isLoginLocked()).isTrue();
        verify(emailService).sendAccountLockedEmail(eq("ali@veli.com"), any(), any());
    }

    /** Kalıcı kilitte doğru şifre de geçmez; yanıt "şifreni sıfırla" der. */
    @Test
    void kalici_kilitte_dogru_sifre_de_gecmez() {
        User user = companyOwner();
        user.setLockedUntilPasswordReset(true);
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Parola123", "hash")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(new LoginRequest("ali@veli.com", "Parola123")))
                .isInstanceOf(AccountLockedException.class)
                .matches(e -> ((AccountLockedException) e).isUntilPasswordReset());
    }

    /** Başarılı giriş kilit sayacını da sıfırlar: sonraki seri baştan başlar. */
    @Test
    void basarili_giris_kilit_sayacini_da_sifirlar() {
        User user = companyOwner();
        user.setLockCount(2);
        user.setFailedLoginAttempts(3);
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Parola123", "hash")).thenReturn(true);
        when(userDetailsService.loadUserByUsername("ali@veli.com")).thenReturn(new CustomUserDetails(user));

        authService.login(new LoginRequest("ali@veli.com", "Parola123"));

        assertThat(user.getLockCount()).isZero();
        assertThat(user.getFailedLoginAttempts()).isZero();
    }

    /** Kilit /auth/reactivate ucundan da işler; yoksa saldırgan oradan denerdi. */
    @Test
    void kilit_hesap_geri_alma_ucunda_da_gecerlidir() {
        User user = companyOwner();
        user.setStatus("INACTIVE");
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Parola123", "hash")).thenReturn(true);

        assertThatThrownBy(() -> authService.reactivateAccount(new LoginRequest("ali@veli.com", "Parola123")))
                .isInstanceOf(AccountLockedException.class);
    }

    private void givenLoggedInOwner() {
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(companyOwner()));
        when(passwordEncoder.matches("Parola123", "hash")).thenReturn(true);
    }

    private AccountCloseRequest closeRequest(String password) {
        AccountCloseRequest request = new AccountCloseRequest();
        request.setPassword(password);
        return request;
    }

    /** Şirketten çıkarılan kullanıcı kendi şirketini kurunca sahibi olur. */
    @Test
    void sirketsizKullanici_kendi_sirketini_kurunca_sahip_olur() {
        User sirketsiz = new User();
        sirketsiz.setEmail("cikarilan@ornek.com");
        sirketsiz.setStatus("ACTIVE");
        when(userRepository.findByEmail("cikarilan@ornek.com")).thenReturn(Optional.of(sirketsiz));
        when(companyRepository.save(any())).thenAnswer(i -> {
            Company saved = i.getArgument(0);
            saved.setId("yeni-sirket");
            return saved;
        });
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        authService.foundCompany("cikarilan@ornek.com", kurulacakSirket());

        assertThat(sirketsiz.getCompanyId()).isEqualTo("yeni-sirket");
        assertThat(sirketsiz.getRoles()).containsExactly(UserRole.COMPANY_OWNER.name());
        // Kurucunun onaylayacak kimsesi yok; paneli hemen açılmalı.
        assertThat(sirketsiz.getMembershipStatus()).isNull();
    }

    @Test
    void sirketi_olan_kullanici_yeni_sirket_kuramaz() {
        when(userRepository.findByEmail("ali@veli.com")).thenReturn(Optional.of(companyOwner()));

        assertThatThrownBy(() -> authService.foundCompany("ali@veli.com", kurulacakSirket()))
                .isInstanceOf(IllegalStateException.class);
        verify(companyRepository, never()).save(any());
    }

    private CompanyDto kurulacakSirket() {
        CompanyDto dto = new CompanyDto();
        dto.setName("Yeni Kafe");
        dto.setEmail("info@yenikafe.com");
        dto.setPhone("+905551112233");
        dto.setWebsite("https://yenikafe.com");
        dto.setCompanyType(CompanyType.RESTAURANT_CAFE);
        return dto;
    }

    private User companyOwner() {
        User user = new User();
        user.setEmail("ali@veli.com");
        user.setPassword("hash");
        user.setStatus("ACTIVE");
        user.setCompanyId("c1");
        user.getRoles().add(UserRole.COMPANY_OWNER.name());
        return user;
    }
}
