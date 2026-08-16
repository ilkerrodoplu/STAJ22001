package com.survey.ai.service;
 
import com.survey.ai.dto.*;
import com.survey.ai.dto.*;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.PasswordResetToken;
import com.survey.ai.entity.User;
import com.survey.ai.enums.UserRole;
import com.survey.ai.config.InactiveAccountCleanup;
import com.survey.ai.entity.SecurityEvent;
import com.survey.ai.exception.AccountClosedException;
import com.survey.ai.exception.AccountLockedException;
import com.survey.ai.exception.AuthenticationException;
import com.survey.ai.exception.ResourceAlreadyExistsException;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.exception.TokenExpiredException;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.PasswordResetTokenRepository;
import com.survey.ai.repository.RoleRepository;
import com.survey.ai.entity.SiteSetting;
import com.survey.ai.repository.SiteSettingRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import com.survey.ai.security.CustomUserDetails;
import com.survey.ai.security.CustomUserDetailsService;
import com.survey.ai.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuthService {

    /**
     * Kayıtlı olmayan e-postada da aynı süre harcansın diye kullanılan sabit hash.
     * Gerçek bir hesaba ait değildir; yalnızca bcrypt'i çalıştırmak içindir.
     */
    private static final String DUMMY_PASSWORD_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    /** Bilinmeyen e-posta ile yanlış şifre aynı mesajı döndürür (bkz. login). */
    private static final String INVALID_CREDENTIALS = "E-posta veya şifre hatalı";

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;
    private final CustomUserDetailsService customUserDetailsService;
    private final CompanyRepository companyRepository;
    private final SurveyTemplateRepository surveyTemplateRepository;
    private final SiteSettingRepository siteSettingRepository;
    private final ModelMapper modelMapper;
    private final AuditService auditService;
    private final SurveyNotificationService notificationService;
    private final SecurityEventService securityEventService;

    /** Şifre sıfırlama bağlantısının ömrü (dakika); tek kaynak application.properties. */
    @Value("${app.jwt.password-reset.expiration-minutes:15}")
    private long passwordResetExpirationMinutes;

    /** Hesabın kilitlenmesi için gereken ard arda hatalı deneme sayısı. */
    @Value("${app.security.login.max-attempts:5}")
    private int maxLoginAttempts;

    /** İlk kilidin kaç dakika süreceği; sonrakiler katlanır. */
    @Value("${app.security.login.lock-minutes:15}")
    private long lockMinutes;

    /** Her yeni kilitte sürenin kaç katına çıkacağı. */
    @Value("${app.security.login.lock-escalation-factor:5}")
    private long lockEscalationFactor;

    /** Bu kadar süreli kilitten sonra hesap şifre sıfırlanana kadar kilitlenir. */
    @Value("${app.security.login.max-lock-cycles:3}")
    private int maxLockCycles;

    /** Süreli kilit için üst sınır (30 gün); katlanan süre saçmalamasın. */
    private static final long MAX_LOCK_MINUTES = 30L * 24 * 60;

    /**
     * ÖNCE şifre doğrulanır, SONRA hesap durumu bildirilir.
     * <p>
     * Eskiden sıra tersti: kayıtlı olmayan e-posta 404, kapatılmış hesap 423,
     * dondurulmuş hesap 403, yalnızca yanlış şifre 401 dönüyordu. Yani şifreyi
     * bilmeyen biri bir e-postanın sistemde olup olmadığını, hatta hesabın
     * durumunu tek istekte öğrenebiliyordu. Durum bilgisi artık ancak hesabın
     * sahibi olduğunu kanıtlayana gösterilir; bilinmeyen e-posta ile yanlış şifre
     * ayırt edilemez.
     */
    public AuthResponse login(LoginRequest loginRequest) {
        User user = findForCredentialCheck(loginRequest.getEmail(), loginRequest.getPassword());
        verifyPasswordOrLock(user, loginRequest.getPassword());

        if (user.getDeactivatedAt() != null || "INACTIVE".equalsIgnoreCase(user.getStatus())) {
            LocalDateTime deactivatedAt = user.getDeactivatedAt() != null
                    ? user.getDeactivatedAt()
                    : user.getUpdatedAt();
            throw new AccountClosedException(deactivatedAt,
                    deactivatedAt == null ? null : deactivatedAt.plusYears(InactiveAccountCleanup.RETENTION_YEARS));
        }

        requireNotSuspended(user);

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),
                            loginRequest.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            String token = tokenProvider.generateToken(authentication);
            String refreshToken = tokenProvider.generateRefreshToken(authentication);

            return new AuthResponse(
                    token,
                    refreshToken,
                    user
            );
        } catch (Exception e) {
            throw new AuthenticationException(INVALID_CREDENTIALS);
        }
    }

    /* ==================== Hatalı giriş / hesap kilidi ==================== */

    /**
     * Kimlik kontrolü yapacak akışlar için kullanıcıyı bulur. Kullanıcı yoksa
     * bcrypt yine de çalıştırılır: aksi halde yanıt belirgin biçimde daha hızlı
     * döner ve süre farkı e-postanın kayıtlı olup olmadığını ele verir.
     */
    private User findForCredentialCheck(String email, String rawPassword) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    passwordEncoder.matches(rawPassword, DUMMY_PASSWORD_HASH);
                    return new AuthenticationException(INVALID_CREDENTIALS);
                });
    }

    /**
     * Şifreyi doğrular; yanlışsa sayacı artırır, sınır aşılınca hesabı geçici
     * olarak kilitler. Giriş ve hesap geri alma aynı yerden geçer, aksi halde
     * saldırgan kilitli hesabı /auth/reactivate üzerinden denemeye devam ederdi.
     * <p>
     * Kilitliyken de şifre doğrulanır. Sebebi kimlik sayımını (enumeration)
     * önlemek: doğru şifreyi bilen kişi zaten hesabın var olduğunu biliyordur,
     * ona kilidin ne zaman açılacağı söylenir. Yanlış şifrede ise sıradan bir
     * hatalı giriş yanıtı döner, yani "bu hesap kilitli" cevabı bir e-postanın
     * kayıtlı olduğunu dışarıya sızdırmaz.
     */
    private void verifyPasswordOrLock(User user, String rawPassword) {
        boolean passwordCorrect = passwordEncoder.matches(rawPassword, user.getRealPassword());

        if (user.isLoginLocked()) {
            if (passwordCorrect) {
                throw user.isLockedUntilPasswordReset()
                        ? AccountLockedException.untilPasswordReset()
                        : new AccountLockedException(user.getLockedUntil());
            }
            throw new AuthenticationException(INVALID_CREDENTIALS);
        }

        if (passwordCorrect) {
            clearFailedAttempts(user);
            return;
        }

        // Kilidi TETİKLEYEN denemede kilit bilgisi registerFailedAttempt içinden
        // fırlar. Eskiden bu istek de sıradan 401 dönüyordu: hesap veritabanında
        // kilitlenmiş oluyor ama kullanıcı bunu ancak bir sonraki istekte
        // (genelde sayfayı yeniledikten sonra) görüyordu.
        registerFailedAttempt(user);
        throw new AuthenticationException(INVALID_CREDENTIALS,
                maxLoginAttempts - user.getFailedLoginAttempts());
    }

    /**
     * Hatalı denemeyi sayar; sınıra ulaşınca hesabı kilitler ve kilidi bildiren
     * {@link AccountLockedException} fırlatır - yani sınırı aşan denemenin kendisi
     * de kilit yanıtını alır.
     * <p>
     * Kilit süresi her seferinde katlanır: ısrarla deneyen saldırgan için maliyet
     * hızla artarken, şifresini karıştıran gerçek kullanıcı ilk seferde yalnızca
     * kısa bir süre bekler. Sabit süre olsaydı saldırgan her açılışta yeni bir
     * deneme paketi kazanıp sınırsız devam edebilirdi.
     * <p>
     * Belirlenen kilit sayısı aşılınca süre uzatmak anlamsızlaşır: hesap yalnızca
     * şifre sıfırlanınca açılır ve kullanıcıya sıfırlama bağlantısı e-postayla
     * gönderilir - hesabın sahibiyse çıkış yolu vardır, saldırgan için kapıdır.
     */
    private void registerFailedAttempt(User user) {
        user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);

        if (user.getFailedLoginAttempts() < maxLoginAttempts) {
            userRepository.save(user);
            return;
        }

        // Sınıra ulaşıldı: sayaç sıfırlanır, kilit sayısı artar.
        user.setFailedLoginAttempts(0);
        user.setLockCount(user.getLockCount() + 1);

        if (user.getLockCount() > maxLockCycles) {
            lockUntilPasswordReset(user);
            throw AccountLockedException.untilPasswordReset();
        }

        long minutes = lockMinutesFor(user.getLockCount());
        user.setLockedUntil(LocalDateTime.now().plusMinutes(minutes));
        userRepository.save(user);

        log.warn("HESAP KILITLENDI | e-posta={} | {}. kilit | {} dakika",
                user.getEmail(), user.getLockCount(), minutes);
        securityEventService.recordWithoutRequest(SecurityEvent.ACCOUNT_LOCKED,
                user.getEmail() + " hesabı " + maxLoginAttempts + " hatalı giriş denemesinden sonra "
                        + minutes + " dakika kilitlendi (" + user.getLockCount() + ". kez)");

        throw new AccountLockedException(user.getLockedUntil());
    }

    /**
     * Kilit süresi: taban süre × katsayı^(kilit sayısı - 1).
     * Örn. 15 dk taban ve 5 katsayısıyla 15 → 75 → 375 dakika.
     */
    private long lockMinutesFor(int lockCount) {
        long minutes = lockMinutes;
        for (int i = 1; i < lockCount; i++) {
            // Taşmaya karşı üst sınır: aşırı yapılandırmada süre negatife dönmesin.
            if (minutes > MAX_LOCK_MINUTES / lockEscalationFactor) {
                return MAX_LOCK_MINUTES;
            }
            minutes *= lockEscalationFactor;
        }
        return minutes;
    }

    /** Son aşama: hesap yalnızca şifre sıfırlanınca açılır; bağlantı e-postayla gider. */
    private void lockUntilPasswordReset(User user) {
        user.setLockedUntil(null);
        user.setLockedUntilPasswordReset(true);
        userRepository.save(user);

        log.warn("HESAP KALICI KILITLENDI | e-posta={} | şifre sıfırlanana kadar", user.getEmail());
        securityEventService.recordWithoutRequest(SecurityEvent.ACCOUNT_LOCKED,
                user.getEmail() + " hesabı ısrarlı hatalı giriş nedeniyle şifre sıfırlanana kadar kilitlendi");

        // E-posta gönderilemezse de kilit durmalı; kullanıcı "Şifremi Unuttum"
        // ekranından kendi bağlantısını isteyebilir.
        try {
            emailService.sendAccountLockedEmail(user.getEmail(), user.getName(),
                    createPasswordResetToken(user));
        } catch (Exception e) {
            log.error("Hesap kilidi e-postası gönderilemedi ({}): {}", user.getEmail(), e.getMessage());
        }
    }

    /** Başarılı girişte sayaçlar ve kilit temizlenir; gereksiz yazma yapılmaz. */
    private void clearFailedAttempts(User user) {
        if (user.getFailedLoginAttempts() == 0 && user.getLockCount() == 0
                && user.getLockedUntil() == null) {
            return;
        }
        user.clearLoginLock();
        userRepository.save(user);
    }

    public AuthResponse register(RegistrationRequest request) {
        // Tip önemli: RuntimeException genel işleyiciye düşüp 500 + sabit mesaj
        // dönüyordu, kullanıcı kaydın neden reddedildiğini göremiyordu.
        if (userRepository.existsByEmail(request.getUser().getEmail())) {
            throw new ResourceAlreadyExistsException("kullanıcı", "e-posta", request.getUser().getEmail());
        }

        if (companyRepository.existsByEmail(request.getCompany().getEmail())) {
            throw new ResourceAlreadyExistsException("şirket", "e-posta", request.getCompany().getEmail());
        }

        try {
            // Şirket kaydet
            Company company = createCompany(request.getCompany());
            company = companyRepository.save(company);
            log.info("Company created with id: {}", company.getId());

            // Kullanıcı kaydet
            User user = createUser(request.getUser(), company, UserRole.COMPANY_OWNER);
            user = saveNewUser(user);
            log.info("User created with id: {}", user.getId());

            // CustomUserDetails oluştur ve token üret
            CustomUserDetails userDetails = (CustomUserDetails) customUserDetailsService.loadUserByUsername(user.getEmail());
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);

            String token = tokenProvider.generateToken(authentication);
            String refreshToken = tokenProvider.generateRefreshToken(authentication);

            return AuthResponse.builder()
                    .token(token)
                    .refreshToken(refreshToken)
                    .user(user)
                    .company(CompanyResponse.from(company))
                    .message("Kayıt başarıyla tamamlandı")
                    .build();

        } catch (RuntimeException e) {
            // Hata TİPİ korunur: benzersizlik ihlali 409, beklenmeyen hata 500 +
            // sabit mesaj olarak döner. Eskiden hepsi tek bir RuntimeException'a
            // sarılıyor ve e.getMessage() istemciye aynen gidiyordu.
            log.error("Kayıt başarısız: ", e);
            throw e;
        }
    }

    /**
     * Çalışan kaydı. Kayıt kodu isteğe bağlıdır:
     * <ul>
     *   <li>Kod verilirse şirket kodundan bulunur, hesap en dar rolle
     *       (COMPANY_STAFF) ve sahibin onayını bekler durumda açılır.</li>
     *   <li>Kod verilmezse hesap hiçbir şirkete bağlanmaz; kullanıcı sonradan
     *       kodla katılır ya da kendi şirketini kurar.</li>
     * </ul>
     */
    public AuthResponse registerEmployee(EmployeeRegistrationRequest request) {
        if (userRepository.existsByEmail(request.getUser().getEmail())) {
            throw new ResourceAlreadyExistsException("kullanıcı", "e-posta", request.getUser().getEmail());
        }

        if (!request.hasInviteCode()) {
            return registerCompanylessUser(request);
        }

        // Locale.ROOT şart: Türkçe locale'de "i" harfi "İ" oluyor ve kod eşleşmiyor.
        String code = request.getInviteCode().trim().toUpperCase(java.util.Locale.ROOT);

        // Süper admin kayıt kodu: şirkete bağlanmaz, kaydolan kişi de süper admin olur.
        Optional<SiteSetting> adminCode = siteSettingRepository.findByAdminInviteCode(code);
        if (adminCode.isPresent()) {
            SiteSetting setting = adminCode.get();
            InviteCode.requireUsable(setting.getAdminInviteCodeUpdatedAt(), setting.getAdminInviteCodeUses());
            setting.setAdminInviteCodeUses(setting.getAdminInviteCodeUses() + 1);
            siteSettingRepository.save(setting);
            return registerSiteAdmin(request);
        }

        Company company = companyRepository.findByInviteCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Şirket", "kayıt kodu", request.getInviteCode()));

        // Kod kısa ömürlüdür. Yenileme kod görüntülenirken yapıldığı için eski kod
        // veritabanında durabiliyor; süresi burada da denetlenmezse kod aslında
        // hiç eskimemiş olurdu.
        InviteCode.requireUsable(company.getInviteCodeUpdatedAt(), company.getInviteCodeUses());
        company.setInviteCodeUses(company.getInviteCodeUses() + 1);
        companyRepository.save(company);

        User newStaff = createUser(request.getUser(), company, UserRole.COMPANY_STAFF);
        newStaff.setMembershipStatus("PENDING");
        User user = saveNewUser(newStaff);
        log.info("Şirket çalışanı kaydedildi (onay bekliyor): {} -> {}", user.getEmail(), company.getName());
        notificationService.notifyJoinRequest(company.getId(), user);

        CustomUserDetails userDetails = (CustomUserDetails) customUserDetailsService.loadUserByUsername(user.getEmail());
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        return AuthResponse.builder()
                .token(tokenProvider.generateToken(authentication))
                .refreshToken(tokenProvider.generateRefreshToken(authentication))
                .user(user)
                .company(CompanyResponse.from(company))
                .message(company.getName() + " şirketine katılma isteğiniz iletildi. "
                        + "Şirket sahibi onaylayana kadar yalnızca profil ve ayarlar sayfalarını görebilirsiniz.")
                .build();
    }

    /**
     * Yeni hesabı kaydeder ve hoş geldin e-postasını gönderir. Dört kayıt yolu
     * (şirket kuran sahip, kodlu çalışan, kodsuz çalışan, süper admin) buradan
     * geçer; e-posta tek yerde durur, biri unutulmaz.
     */
    private User saveNewUser(User user) {
        User saved = userRepository.save(user);
        emailService.sendWelcomeEmail(saved.getEmail(), saved.getName());
        return saved;
    }

    /**
     * Süper adminin uyguladığı yaptırım. Hesap ya da bağlı olduğu şirket
     * dondurulmuşsa giriş yapılamaz; çözme yalnızca süper adminde.
     */
    private void requireNotSuspended(User user) {
        if (user.isSuspended()) {
            throw new AccessDeniedException(
                    "Hesabınız site yöneticisi tarafından donduruldu. Destek mesajıyla itiraz edebilirsiniz.");
        }
        if (user.getCompanyId() != null
                && companyRepository.findById(user.getCompanyId()).map(Company::isSuspended).orElse(false)) {
            throw new AccessDeniedException(
                    "Şirketiniz site yöneticisi tarafından donduruldu. Destek mesajıyla itiraz edebilirsiniz.");
        }
    }

    /**
     * Şirketten çıkarılan (ya da isteği reddedilen) kullanıcının kendi şirketini
     * kurması. Hesap zaten var; yalnızca şirket bilgileri istenir ve kullanıcı bu
     * şirketin sahibi olur. Yetki veritabanından okunduğu için yeni token gerekmez.
     */
    @Transactional
    public CompanyResponse foundCompany(String email, CompanyDto companyDto) {
        User user = getProfile(email);

        if (user.getCompanyId() != null) {
            throw new IllegalStateException("Zaten bir şirkete bağlısınız");
        }
        if (user.hasRole(UserRole.ADMIN.name())) {
            throw new AccessDeniedException("Süper admin hesabı şirket kuramaz");
        }
        if (companyRepository.existsByEmail(companyDto.getEmail())) {
            throw new ResourceAlreadyExistsException("şirket", "e-posta", companyDto.getEmail());
        }

        Company company = companyRepository.save(createCompany(companyDto));

        user.setCompanyId(company.getId());
        user.setRoles(new HashSet<>(Set.of(UserRole.COMPANY_OWNER.name())));
        // Sahibin onaylayacak kimsesi yok; şirket kurulur kurulmaz paneli açılır.
        user.setMembershipStatus(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        auditService.record(AuditService.COMPANY_FOUNDED, company.getName(), "kurucu: " + user.getEmail());
        log.info("{} kullanıcısı yeni şirket kurdu: {}", user.getEmail(), company.getId());
        return CompanyResponse.from(company);
    }

    /**
     * Kodsuz açılan çalışan hesabı: şirketi ve rolü yoktur. Panel yerine
     * "şirkete katıl / şirket kur" ekranına düşer - çıkarılan çalışanla aynı
     * durumdadır, ikinci bir akış gerekmez.
     */
    private AuthResponse registerCompanylessUser(EmployeeRegistrationRequest request) {
        User user = createUser(request.getUser(), null, UserRole.COMPANY_STAFF);
        user.setRoles(new HashSet<>());
        user = saveNewUser(user);
        log.info("Şirketsiz çalışan hesabı açıldı: {}", user.getEmail());

        CustomUserDetails userDetails = (CustomUserDetails) customUserDetailsService.loadUserByUsername(user.getEmail());
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        return AuthResponse.builder()
                .token(tokenProvider.generateToken(authentication))
                .refreshToken(tokenProvider.generateRefreshToken(authentication))
                .user(user)
                .message("Hesabınız oluşturuldu. Giriş yaptıktan sonra şirketinizin kayıt koduyla "
                        + "katılabilir ya da kendi şirketinizi kurabilirsiniz.")
                .build();
    }

    /** Süper adminin eklediği çalışan da süper admindir; şirkete bağlanmaz. */
    private AuthResponse registerSiteAdmin(EmployeeRegistrationRequest request) {
        User user = saveNewUser(createUser(request.getUser(), null, UserRole.ADMIN));
        log.warn("Yeni süper admin kaydedildi: {}", user.getEmail());

        CustomUserDetails userDetails = (CustomUserDetails) customUserDetailsService.loadUserByUsername(user.getEmail());
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        return AuthResponse.builder()
                .token(tokenProvider.generateToken(authentication))
                .refreshToken(tokenProvider.generateRefreshToken(authentication))
                .user(user)
                .message("Süper admin hesabınız oluşturuldu")
                .build();
    }

    private Company createCompany(CompanyDto companyDto) {
        // Şirket türüne uygun alt sınıf; OTHER ise temel Company kullanılır.
        Company company = Company.newInstance(companyDto.getCompanyType());
        modelMapper.map(companyDto, company);
        company.setCreatedAt(LocalDateTime.now());
        company.setUpdatedAt(LocalDateTime.now());
        company.setStatus("ACTIVE");
        company.setInviteCode(Company.newInviteCode());

        if (company.getStatus() == null) {
            company.setStatus("ACTIVE");
        }

        return company;
    }

    private User createUser(UserDto userDto, Company company, UserRole role) {
        User user = modelMapper.map(userDto, User.class);

        // Şifreyi encode et
        user.setPassword(passwordEncoder.encode(userDto.getPassword()));

        // name = ad, lastName = soyad. Birleştirme yapılmaz; aksi halde soyad
        // hem name içinde hem lastName'de durup profilde iki kez görünüyordu.
        user.setName(userDto.getFirstName());
        user.setLastName(userDto.getLastName());

        // Company referansı (süper adminde şirket yoktur)
        user.setCompanyId(company == null ? null : company.getId());

        // Timestamps
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        user.setStatus("ACTIVE");

        // Rol istemciden alınmaz: şirket kaydında sahip, kayıt koduyla katılanda çalışan.
        user.setRoles(new HashSet<>(Set.of(role.name())));

        return user;
    }


    public User getProfile(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "e-posta", email));
    }

    /**
     * Oturumdaki kullanıcının kişisel bilgilerini günceller.
     * E-posta JWT'nin subject'i olduğu için değişiklik sonrası yeni token üretilir;
     * aksi halde eski token bir sonraki istekte geçersiz kalırdı.
     */
    @Transactional
    public AuthResponse updateProfile(String currentEmail, ProfileUpdateRequest request) {
        User user = getProfile(currentEmail);

        String newEmail = request.getEmail().trim().toLowerCase();
        if (!newEmail.equalsIgnoreCase(currentEmail) && userRepository.existsByEmail(newEmail)) {
            throw new ResourceAlreadyExistsException("kullanıcı", "e-posta", newEmail);
        }

        // Süper admin işlem kayıtlarında görünsün diye ne değiştiği önce çıkarılır.
        String changes = AuditService.describe(
                AuditService.change("ad", user.getName(), request.getName()),
                AuditService.change("soyad", user.getLastName(), request.getLastName()),
                AuditService.change("e-posta", user.getEmail(), newEmail),
                AuditService.change("telefon", user.getPhone(), request.getPhone()),
                AuditService.change("adres", user.getAddress(), request.getAddress()));

        user.setName(request.getName());
        user.setLastName(request.getLastName());
        user.setEmail(newEmail);
        user.setPhone(request.getPhone());
        user.setAddress(request.getAddress());
        user.setUpdatedAt(LocalDateTime.now());
        user = userRepository.save(user);

        if (changes != null) {
            auditService.record(AuditService.USER_PROFILE_UPDATED, user.getEmail(), changes);
        }

        CustomUserDetails userDetails = (CustomUserDetails) customUserDetailsService.loadUserByUsername(newEmail);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        return AuthResponse.builder()
                .token(tokenProvider.generateToken(authentication))
                .refreshToken(tokenProvider.generateRefreshToken(authentication))
                .user(user)
                .userResponse(UserResponse.from(user))
                .message("Profil bilgileri güncellendi")
                .build();
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = getProfile(email);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getRealPassword())) {
            throw new AuthenticationException("Mevcut şifre hatalı");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        emailService.sendPasswordChangedEmail(user.getEmail(), user.getName());
    }

    /**
     * Hesabı kapatır. Şirket sahibinin aktif anketi varsa kapatılmaz.
     * Hesap silinmez, önce pasife alınır; 1 yıl içinde geri alınmazsa gece çalışan
     * {@code InactiveAccountCleanup} görevi tarafından silinir.
     */
    @Transactional
    public void closeAccount(String email, AccountCloseRequest request) {
        User user = getProfile(email);

        if (!passwordEncoder.matches(request.getPassword(), user.getRealPassword())) {
            throw new AuthenticationException("Şifre hatalı");
        }

        // Süper admin hesabı panelden kapatılamaz; yalnızca veritabanından silinebilir.
        if (user.hasRole(UserRole.ADMIN.name())) {
            throw new AccessDeniedException(
                    "Süper admin hesabı panelden kapatılamaz. Kaldırma işlemi veritabanı üzerinden yapılır.");
        }

        if (user.hasRole(UserRole.COMPANY_OWNER.name()) && user.getCompanyId() != null
                && surveyTemplateRepository.existsByCompanyIdAndActive(user.getCompanyId(), true)) {
            throw new IllegalStateException(
                    "Aktif anketiniz olduğu için hesabınız kapatılamaz. Önce anketlerinizi kapatın.");
        }

        user.setStatus("INACTIVE");
        user.setDeactivatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        log.info("Hesap pasife alındı: {}", email);
    }

    /** Pasife alınmış hesabı şifresiyle geri alır; silinmediği sürece her zaman mümkündür. */
    @Transactional
    public AuthResponse reactivateAccount(LoginRequest request) {
        // login ile aynı kural: bilinmeyen e-posta ile yanlış şifre ayırt edilemez,
        // hatalı denemeler sayılır ve sınır aşılınca hesap kilitlenir.
        User user = findForCredentialCheck(request.getEmail(), request.getPassword());
        verifyPasswordOrLock(user, request.getPassword());

        // Kullanıcının kendi kapattığı hesap geri alınabilir; süper adminin
        // dondurduğu hesap alınamaz, aksi halde yaptırım tek tıkla aşılırdı.
        requireNotSuspended(user);

        user.setStatus("ACTIVE");
        user.setDeactivatedAt(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return login(request);
    }

    @Transactional
    public void sendPasswordResetEmail(String email) {
        // Kayıtlı olmayan adres için de 200 dönülür: 404, hangi e-postanın
        // sistemde olduğunu dışarıdan sorgulanabilir hale getiriyordu.
        Optional<User> found = userRepository.findByEmail(email);
        if (found.isEmpty()) {
            log.info("Şifre sıfırlama isteği bilinmeyen adrese geldi, sessizce yutuldu");
            return;
        }
        User user = found.get();

        emailService.sendPasswordResetEmail(user.getEmail(), user.getName(),
                createPasswordResetToken(user));
    }

    /**
     * Tek kullanımlık şifre sıfırlama kodu üretir; önceki kodlar iptal edilir.
     * Hem "Şifremi Unuttum" hem de hesap kilidi e-postası buradan geçer.
     * <p>
     * Süre ayardan gelir: kod 24 saat kullanıyordu ve
     * application.properties'teki app.jwt.password-reset.expiration-minutes
     * hiç okunmuyordu. Bağlantının ömrü ne kadar uzunsa, sızan ya da e-posta
     * kutusunda duran bağlantı o kadar uzun süre kullanılabilir.
     */
    private String createPasswordResetToken(User user) {
        passwordResetTokenRepository.deleteByUserId(user.getId());

        String token = UUID.randomUUID().toString();
        PasswordResetToken passwordResetToken = new PasswordResetToken();
        passwordResetToken.setUserId(user.getId());
        passwordResetToken.setToken(token);
        passwordResetToken.setExpiryDate(LocalDateTime.now().plusMinutes(passwordResetExpirationMinutes));
        passwordResetTokenRepository.save(passwordResetToken);

        return token;
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken passwordResetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Sıfırlama bağlantısı", "token", token));

        // Token süresinin dolup dolmadığını kontrol et
        if (passwordResetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            passwordResetTokenRepository.delete(passwordResetToken);
            throw new TokenExpiredException("Password reset token expired");
        }

        // Kullanıcının şifresini güncelle
        Optional<User> userOptional = userRepository.findById(passwordResetToken.getUserId());

        if(!userOptional.isPresent()){
            throw new ResourceNotFoundException("Kullanıcı", "id", passwordResetToken.getUserId());
        }
        User user = userOptional.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        // Kalıcı kilidin tek çıkış yolu burasıdır: sıfırlama bağlantısını
        // kullanan kişi posta kutusuna sahip olduğunu kanıtlamıştır.
        //
        // SÜRELİ kilit ise BİLEREK korunur (lockedUntil'e dokunulmaz): kısa
        // kilit beklenerek geçilmeli, şifre sıfırlayarak atlanabilen bir
        // bekleme cezası caydırıcılığını yitirir.
        user.setFailedLoginAttempts(0);
        user.setLockCount(0);
        user.setLockedUntilPasswordReset(false);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Şifre değişikliği e-postası gönder
        emailService.sendPasswordChangedEmail(user.getEmail(), user.getName());

        // Kullanılmış token'ı sil
        passwordResetTokenRepository.delete(passwordResetToken);
    }

    /**
     * Erişim token'ını yeniler. Üç kontrol eskiden yoktu:
     * <ul>
     *   <li><b>Tür:</b> token'ın gerçekten refresh token olduğu doğrulanmıyordu;
     *       elindeki erişim token'ıyla süresiz yenileme yapılabiliyordu.</li>
     *   <li><b>Hesap durumu:</b> dondurulmuş/kapatılmış hesap yenileme ile
     *       oturumunu sürdürebiliyordu.</li>
     *   <li><b>Principal tipi:</b> {@code email} string'i veriliyordu; token
     *       üretimi {@code CustomUserDetails} beklediği için uç ClassCastException
     *       ile patlıyordu, yani hiç çalışmıyordu.</li>
     * </ul>
     * Yetkiler token'dan değil veritabanından okunur: rolü düşürülen kullanıcı
     * eski yetkilerini yenileyerek taşıyamaz.
     */
    public AuthResponse refreshToken(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken) || !tokenProvider.isRefreshToken(refreshToken)) {
            throw new TokenExpiredException("Oturum yenilenemedi, lütfen tekrar giriş yapın");
        }

        String email = tokenProvider.getEmailFromJWT(refreshToken);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new TokenExpiredException("Oturum yenilenemedi, lütfen tekrar giriş yapın"));

        if (!user.isActive()) {
            throw new AccessDeniedException("Hesabınız etkin değil");
        }
        requireNotSuspended(user);

        CustomUserDetails userDetails = (CustomUserDetails) customUserDetailsService.loadUserByUsername(email);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        return new AuthResponse(
                tokenProvider.generateToken(authentication),
                tokenProvider.generateRefreshToken(authentication),
                user
        );
    }
}
