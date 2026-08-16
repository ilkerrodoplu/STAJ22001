package com.survey.ai.service;

import com.survey.ai.dto.AdminCompanyView;
import com.survey.ai.dto.AdminSurveyView;
import com.survey.ai.dto.AdminUserView;
import com.survey.ai.dto.InviteCode;
import com.survey.ai.dto.SiteContentDto;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.SiteSetting;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.entity.User;
import com.survey.ai.enums.CompanyType;
import com.survey.ai.enums.UserRole;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SiteSettingRepository;
import com.survey.ai.repository.SurveyResponseRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Süper admin paneli: kullanıcılar, anketler ve uygunsuz anket uyarıları.
 * Uyarılan anket {@link #WARNING_GRACE_DAYS} gün içinde düzeltilmezse pasife alınır;
 * süper admin anket içeriğine dokunamaz ve anket silemez.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SuperAdminService {

    /** Uyarıdan sonra şirket sahibine tanınan düzeltme süresi. */
    public static final int WARNING_GRACE_DAYS = 7;

    /** Panel grafiğindeki gün sayısı. */
    private static final int DAILY_SERIES_DAYS = 30;

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final SurveyTemplateRepository surveyTemplateRepository;
    private final SurveyResponseRepository surveyResponseRepository;
    private final SiteSettingRepository siteSettingRepository;
    private final EmailService emailService;
    private final SurveyNotificationService notificationService;
    private final SupportMessageService supportMessageService;
    private final AuditService auditService;

    /**
     * Süper admin kayıt kodu. Bu kodla kaydolan kullanıcı da süper admin olur;
     * şirkete bağlanmaz.
     */
    public InviteCode getOrCreateAdminInviteCode() {
        SiteSetting setting = siteSettingRepository.findById(SiteSetting.SINGLETON_ID)
                .orElseGet(SiteSetting::new);
        if (setting.getAdminInviteCode() == null || setting.getAdminInviteCode().isBlank()
                || InviteCode.expired(setting.getAdminInviteCodeUpdatedAt())
                || InviteCode.usedUp(setting.getAdminInviteCodeUses())) {
            return rotateAdminInviteCode(setting);
        }
        return InviteCode.of(setting.getAdminInviteCode(), setting.getAdminInviteCodeUpdatedAt());
    }

    public InviteCode regenerateAdminInviteCode() {
        SiteSetting setting = siteSettingRepository.findById(SiteSetting.SINGLETON_ID)
                .orElseGet(SiteSetting::new);
        log.warn("Süper admin kayıt kodu yenilendi");
        return rotateAdminInviteCode(setting);
    }

    private InviteCode rotateAdminInviteCode(SiteSetting setting) {
        LocalDateTime now = LocalDateTime.now();
        setting.setAdminInviteCode(Company.newInviteCode());
        setting.setAdminInviteCodeUpdatedAt(now);
        setting.setAdminInviteCodeUses(0);
        setting.setUpdatedAt(now);
        siteSettingRepository.save(setting);
        return InviteCode.of(setting.getAdminInviteCode(), now);
    }

    /* ---------- Site metinleri ---------- */

    /**
     * Gizlilik sözleşmesi, kullanım şartları ve iletişim metni. Ayar kaydı tek
     * satırdır ({@link SiteSetting#SINGLETON_ID}); henüz hiç kaydedilmediyse boş
     * metinlerle döner, ziyaretçi ucu da aynı yanıtı kullanır.
     */
    public SiteContentDto siteContent() {
        return SiteContentDto.from(siteSettingRepository.findById(SiteSetting.SINGLETON_ID)
                .orElseGet(SiteSetting::new));
    }

    /**
     * Metinleri günceller. Boş bırakılan alan silinmez, olduğu gibi korunur:
     * süper admin yalnızca iletişim bilgisini değiştirdiğinde sözleşme metninin
     * uçmaması gerekir.
     */
    public SiteContentDto updateSiteContent(SiteContentDto request) {
        SiteSetting setting = siteSettingRepository.findById(SiteSetting.SINGLETON_ID)
                .orElseGet(SiteSetting::new);

        if (request.getPrivacyPolicy() != null) {
            setting.setPrivacyPolicy(request.getPrivacyPolicy());
        }
        if (request.getTermsOfService() != null) {
            setting.setTermsOfService(request.getTermsOfService());
        }
        if (request.getContactInfo() != null) {
            setting.setContactInfo(request.getContactInfo());
        }

        LocalDateTime now = LocalDateTime.now();
        setting.setContentUpdatedAt(now);
        setting.setUpdatedAt(now);
        siteSettingRepository.save(setting);

        auditService.record(AuditService.SITE_CONTENT_UPDATED, "Site metinleri", null);
        log.info("Site metinleri güncellendi");
        return SiteContentDto.from(setting);
    }

    /** Sistemdeki süper adminler. */
    public List<AdminUserView> listAdmins() {
        return userRepository.findByRole(UserRole.ADMIN.name()).stream()
                .map(user -> AdminUserView.of(user, null))
                .toList();
    }

    public List<AdminUserView> listUsers() {
        Map<String, String> companyNames = companyNames();
        return userRepository.findAll().stream()
                .map(user -> AdminUserView.of(user, companyNames.get(user.getCompanyId())))
                .toList();
    }

    /** Süper adminin şirket yönetimi listesi: sahibi, kullanıcı ve anket sayısıyla. */
    public List<AdminCompanyView> listCompanies() {
        Map<String, User> owners = userRepository.findByRole(UserRole.COMPANY_OWNER.name()).stream()
                .filter(user -> user.getCompanyId() != null)
                .collect(Collectors.toMap(User::getCompanyId, user -> user, (a, b) -> a));

        Map<String, Long> userCounts = countByCompany(userRepository.findAll().stream()
                .map(User::getCompanyId));
        Map<String, Long> surveyCounts = countByCompany(surveyTemplateRepository.findAll().stream()
                .map(SurveyTemplate::getCompanyId));

        return companyRepository.findAll().stream()
                .map(company -> AdminCompanyView.of(company,
                        owners.get(company.getId()),
                        userCounts.getOrDefault(company.getId(), 0L),
                        surveyCounts.getOrDefault(company.getId(), 0L)))
                .toList();
    }

    /**
     * Şirket türünü yalnızca site admini değiştirebilir: tür hazır anket
     * kalıplarını ve masa bazlı QR'ı belirliyor, şirket sahibi kendi başına
     * değiştirirse mevcut anket akışı bozuluyor.
     *
     * ponytail: yalnızca companyType alanı güncellenir; belgedeki _class eski
     * alt sınıfta kalır. Alt sınıflar davranış taşımadığı (her yer companyType
     * alanına bakıyor) için sorun değil - alt sınıfa alan eklenirse belgeyi
     * yeni sınıfla yeniden yazmak gerekir.
     */
    public AdminCompanyView changeCompanyType(String companyId, CompanyType type, String typeOther) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Şirket", "id", companyId));

        company.setCompanyType(type);
        company.setCompanyTypeOther(type == CompanyType.OTHER ? typeOther : null);
        company.setUpdatedAt(LocalDateTime.now());
        companyRepository.save(company);

        auditService.record(AuditService.COMPANY_TYPE_CHANGED, company.getName(), "yeni tür: " + type);
        log.warn("{} şirketinin türü {} olarak değiştirildi", company.getName(), type);
        return AdminCompanyView.of(company, companyOwner(companyId).orElse(null), 0, 0);
    }

    /**
     * Şirket sahipliğini devreder. Sahip hesabını kaybederse şirket sahipsiz
     * kalıyordu: kimse rol atayamıyor, kayıt kodunu göremiyordu. Devri yalnızca
     * süper admin yapabilir.
     *
     * Yeni sahip listeden (userId) ya da e-postayla seçilir. E-postayla gelen
     * kullanıcı başka şirkette ise bu şirkete taşınır; ancak kendi şirketinin
     * sahibiyse taşınmaz, aksi halde o şirket sahipsiz kalırdı.
     */
    public AdminCompanyView transferOwnership(String companyId, String newOwnerId, String newOwnerEmail) {
        Company company = company(companyId);

        User newOwner = findNewOwner(newOwnerId, newOwnerEmail);

        if (!companyId.equals(newOwner.getCompanyId())) {
            if (newOwner.getCompanyId() != null && newOwner.hasRole(UserRole.COMPANY_OWNER.name())) {
                throw new IllegalArgumentException(
                        "Bu kullanıcı başka bir şirketin sahibi; önce o şirketin sahipliğini devredin");
            }
            newOwner.setCompanyId(companyId);
        }
        if (!newOwner.isActive()) {
            throw new IllegalStateException("Pasif ya da dondurulmuş hesap şirket sahibi yapılamaz");
        }

        // Eski sahip(ler) çalışan olarak kalır; şirketten atılmaz. Kayıtta birden
        // fazla sahip görünebildiği için hepsi indirilir.
        LocalDateTime now = LocalDateTime.now();
        List<User> demoted = userRepository
                .findByCompanyIdAndRole(companyId, UserRole.COMPANY_OWNER.name()).stream()
                .filter(user -> !user.getId().equals(newOwner.getId()))
                .peek(user -> {
                    user.setRoles(new HashSet<>(Set.of(UserRole.COMPANY_STAFF.name())));
                    user.setUpdatedAt(now);
                })
                .toList();
        userRepository.saveAll(demoted);

        newOwner.setRoles(new HashSet<>(Set.of(UserRole.COMPANY_OWNER.name())));
        newOwner.setUpdatedAt(now);
        userRepository.save(newOwner);

        auditService.record(AuditService.COMPANY_OWNER_CHANGED, company.getName(),
                "yeni sahip: " + newOwner.getEmail());
        log.warn("{} şirketinin sahipliği {} kullanıcısına devredildi (eski sahip sayısı: {})",
                company.getName(), newOwner.getEmail(), demoted.size());
        return AdminCompanyView.of(company, newOwner, 0, 0);
    }

    /**
     * Şirketi dondurur ya da çözer. Tekrar eden ihlallerde anket bazında askı
     * yetmiyordu; dondurulan şirketin kullanıcıları giriş yapamaz, anketleri
     * yanıt kabul etmez. Anketlerin kendi askı durumu korunur, çözünce eski
     * hâline döner.
     */
    public AdminCompanyView changeCompanyStatus(String companyId, boolean suspended) {
        Company company = company(companyId);

        LocalDateTime now = LocalDateTime.now();
        company.setStatus(suspended ? Company.SUSPENDED : "ACTIVE");
        company.setUpdatedAt(now);
        companyRepository.save(company);

        // Kullanıcılar da işaretlenir: elindeki token'ın geçersiz sayılması
        // kullanıcı durumuna bakıyor, aksi halde yaptırım 24 saat gecikirdi.
        // Kendi hesabını kapatmış (INACTIVE) kullanıcılara dokunulmaz.
        String from = suspended ? "ACTIVE" : Company.SUSPENDED;
        List<User> affected = userRepository.findByCompanyId(companyId).stream()
                .filter(user -> from.equalsIgnoreCase(user.getStatus()))
                .peek(user -> {
                    user.setStatus(suspended ? Company.SUSPENDED : "ACTIVE");
                    user.setUpdatedAt(now);
                })
                .toList();
        userRepository.saveAll(affected);

        notificationService.notifyCompany(companyId,
                suspended ? "Şirketiniz donduruldu" : "Şirketiniz yeniden aktif",
                suspended
                        ? "Site yönetimi şirketinizi dondurdu: giriş ve anket yanıtı durduruldu."
                        : "Dondurma kaldırıldı, hesaplarınız yeniden kullanılabilir.",
                "/admin/messages");

        auditService.record(AuditService.COMPANY_STATUS_CHANGED, company.getName(),
                (suspended ? "donduruldu" : "çözüldü") + ", etkilenen kullanıcı: " + affected.size());
        log.warn("{} şirketi {} ({} kullanıcı etkilendi)", company.getName(),
                suspended ? "donduruldu" : "yeniden aktifleştirildi", affected.size());
        return AdminCompanyView.of(company, companyOwner(companyId).orElse(null), 0, 0);
    }

    /**
     * Kullanıcıyı dondurur ya da çözer. Kullanıcının kendi kapattığı hesaptan
     * (INACTIVE) farklıdır: SUSPENDED hesap şifresiyle geri alınamaz, yalnızca
     * süper admin çözebilir.
     */
    public AdminUserView changeUserStatus(String userId, boolean suspended) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", userId));

        if (user.hasRole(UserRole.ADMIN.name())) {
            throw new AccessDeniedException("Süper admin hesabı dondurulamaz");
        }

        user.setStatus(suspended ? Company.SUSPENDED : "ACTIVE");
        user.setDeactivatedAt(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        auditService.record(AuditService.USER_STATUS_CHANGED, user.getEmail(),
                suspended ? "donduruldu" : "çözüldü");
        log.warn("{} kullanıcısı {}", user.getEmail(), suspended ? "donduruldu" : "yeniden aktifleştirildi");
        return AdminUserView.of(user, companyNames().get(user.getCompanyId()));
    }

    /** Yeni sahip: listeden seçilen kullanıcı ya da elle yazılan e-posta. */
    private User findNewOwner(String newOwnerId, String newOwnerEmail) {
        if (newOwnerId != null && !newOwnerId.isBlank()) {
            return userRepository.findById(newOwnerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", newOwnerId));
        }

        String email = newOwnerEmail == null ? "" : newOwnerEmail.trim();
        if (email.isEmpty()) {
            throw new IllegalArgumentException("Yeni sahip seçilmedi");
        }
        return userRepository.findByEmail(email)
                .or(() -> userRepository.findAll().stream()
                        .filter(user -> email.equalsIgnoreCase(user.getEmail()))
                        .findFirst())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "e-posta", email));
    }

    private Company company(String companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Şirket", "id", companyId));
    }

    private Map<String, Long> countByCompany(java.util.stream.Stream<String> companyIds) {
        return companyIds.filter(java.util.Objects::nonNull)
                .collect(Collectors.groupingBy(id -> id, Collectors.counting()));
    }

    /**
     * Bir ankete gelen tüm yanıtlar; süper admin içerik denetimi için görür.
     * En yeni yanıt başta.
     */
    public List<SurveyResponse> listSurveyResponses(String templateId) {
        return surveyResponseRepository.findBySurveyTemplateId(templateId).stream()
                .sorted(Comparator.comparing(SurveyResponse::getSubmissionDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public List<AdminSurveyView> listSurveys() {
        Map<String, String> companyNames = companyNames();
        Map<String, String> ownerEmails = ownerEmailsByCompany();
        Map<String, String> emailsByUserId = emailsByUserId();
        return surveyTemplateRepository.findAll().stream()
                .map(template -> AdminSurveyView.of(template,
                        companyNames.get(template.getCompanyId()),
                        surveyOwnerEmail(template, emailsByUserId, ownerEmails),
                        WARNING_GRACE_DAYS))
                .toList();
    }

    /**
     * Anketin sahibi onu hazırlayan kullanıcıdır; çalışanın açtığı anket şirket
     * sahibinin değildir. Çalışan şirketten ayrıldığında createdBy zaten şirket
     * sahibine devredilir (CompanyStaffService), böylece anket sahipsiz kalmaz.
     * createdBy'si olmayan eski kayıtlarda şirket sahibine düşülür.
     */
    private static String surveyOwnerEmail(SurveyTemplate template,
                                           Map<String, String> emailsByUserId,
                                           Map<String, String> ownerEmails) {
        String companyOwner = ownerEmails.get(template.getCompanyId());
        if (template.getCreatedBy() == null) {
            return companyOwner;
        }
        return emailsByUserId.getOrDefault(template.getCreatedBy(), companyOwner);
    }

    /**
     * Uygunsuz anket uyarısı. Anket aynı anda yayından kalkar (pasife alınır):
     * uyarılan içerik düzeltilene ve süper admin onaylayana kadar yanıt toplamaz.
     * Sahibine e-posta, panel bildirimi ve destek mesajı gider. Sahibi anketi
     * düzeltirse (updatedAt uyarıdan sonraya geçer) silme görevi anketi atlar.
     */
    public AdminSurveyView warnSurvey(String templateId, String reason) {
        SurveyTemplate template = surveyTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Anket", "id", templateId));

        template.setWarnedAt(LocalDateTime.now());
        template.setWarningReason(reason);
        // updatedAt'e dokunulmaz: "düzeltildi mi" kontrolü updatedAt > warnedAt.
        template.setActive(false);
        template.setStatus("INACTIVE");
        surveyTemplateRepository.save(template);

        Optional<User> owner = companyOwner(template.getCompanyId());
        owner.ifPresent(user -> emailService.sendSurveyWarningEmail(
                user.getEmail(), user.getName(), template.getName(), reason, WARNING_GRACE_DAYS));

        String message = "Anketiniz \"" + template.getName() + "\" yöneticiler tarafından şu sebeple "
                + "askıya alındı: " + reason + " — Anket yayından kaldırıldı. Düzelttiğinizde site "
                + "yönetimi kontrol edip onaylayacak. " + WARNING_GRACE_DAYS
                + " gün içinde düzeltilmezse anket tamamen silinir.";

        notificationService.notifyCompany(template.getCompanyId(),
                "Anket askıya alındı: " + template.getName(), message, "/admin/survey-templates");
        supportMessageService.systemMessage(template.getCompanyId(), true, message, template);

        auditService.record(AuditService.SURVEY_WARNED, template.getName(), reason);
        log.warn("Anket uyarıldı ve pasife alındı: {} ({}) - sebep: {}",
                template.getName(), templateId, reason);
        return view(template);
    }

    /**
     * Süper admin onayı: uyarı kalkar, anket yeniden yayına girer. Yanlış uyarıda da
     * askıdan çıkarmada da yapılan iş aynı olduğu için tek uç üzerinden yürür.
     * Onaylanmadığı sürece anket pasif kalır; şirket düzeltmeye devam eder.
     */
    public AdminSurveyView approveSurvey(String templateId) {
        SurveyTemplate template = surveyTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Anket", "id", templateId));

        template.setWarnedAt(null);
        template.setWarningReason(null);
        template.setSuspendedByAdmin(false);
        template.setSuspendedAt(null);
        template.setActive(true);
        template.setStatus("ACTIVE");
        template.setUpdatedAt(LocalDateTime.now());
        surveyTemplateRepository.save(template);

        String message = "Anketiniz \"" + template.getName()
                + "\" site yönetimi tarafından onaylandı ve yeniden yayında.";
        notificationService.notifyCompany(template.getCompanyId(),
                "Anket yeniden yayında: " + template.getName(), message, "/admin/survey-templates");
        supportMessageService.systemMessage(template.getCompanyId(), true, message, template);

        auditService.record(AuditService.SURVEY_WARNING_CLEARED, template.getName(), null);
        log.info("Anket süper admin onayıyla yayına alındı: {}", templateId);
        return view(template);
    }

    /**
     * Uyarıdan sonra {@link #WARNING_GRACE_DAYS} gün içinde hiç düzeltilmeyen anketleri
     * tamamen siler. Sahibi anketi düzenlediyse updatedAt uyarı anından sonradır ve
     * anket silinmez; onayı süper admin verir. Yanıtlar silinmez.
     */
    @Scheduled(cron = "0 30 0 * * *", zone = "Europe/Istanbul")
    public void deleteUnfixedWarnedSurveys() {
        LocalDateTime deadline = LocalDateTime.now().minusDays(WARNING_GRACE_DAYS);

        List<SurveyTemplate> expired = surveyTemplateRepository.findByWarnedAtBefore(deadline).stream()
                .filter(template -> template.getUpdatedAt() == null
                        || !template.getUpdatedAt().isAfter(template.getWarnedAt()))
                .toList();

        if (expired.isEmpty()) {
            return;
        }

        expired.forEach(template -> {
            companyOwner(template.getCompanyId()).ifPresent(owner ->
                    emailService.sendSurveyDeletedEmail(
                            owner.getEmail(), owner.getName(), template.getName(), WARNING_GRACE_DAYS));
            auditService.record(AuditService.SURVEY_DELETED, template.getName(),
                    "uyarı " + WARNING_GRACE_DAYS + " gün içinde düzeltilmedi");

            String message = "Anketiniz \"" + template.getName() + "\" uyarıya rağmen "
                    + WARNING_GRACE_DAYS + " gün içinde düzeltilmediği için tamamen silindi. "
                    + "Toplanan yanıtlar ve raporlar duruyor.";
            notificationService.notifyCompany(template.getCompanyId(),
                    "Anket silindi: " + template.getName(), message, "/admin/messages");
            supportMessageService.systemMessage(template.getCompanyId(), true, message, template);
        });

        surveyTemplateRepository.deleteAll(expired);
        log.warn("Uyarıya rağmen düzeltilmeyen {} anket silindi", expired.size());
    }

    /** Süper admin panelinin özet sayıları - şirkete değil, tüm sisteme bakar. */
    public Map<String, Object> stats() {
        List<SurveyTemplate> templates = surveyTemplateRepository.findAll();
        List<User> users = userRepository.findAll();

        Map<String, Long> usersByRole = new LinkedHashMap<>();
        for (UserRole role : UserRole.values()) {
            usersByRole.put(role.name(),
                    users.stream().filter(user -> user.hasRole(role.name())).count());
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", users.size());
        stats.put("activeUsers", users.stream().filter(User::isActive).count());
        stats.put("usersByRole", usersByRole);
        stats.put("totalCompanies", companyRepository.count());
        stats.put("totalSurveys", templates.size());
        stats.put("activeSurveys", templates.stream()
                .filter(template -> Boolean.TRUE.equals(template.getActive())).count());
        stats.put("warnedSurveys", templates.stream()
                .filter(template -> template.getWarnedAt() != null).count());
        stats.put("suspendedSurveys", templates.stream()
                .filter(SurveyTemplate::isSuspendedByAdmin).count());
        stats.put("totalResponses", surveyResponseRepository.count());
        stats.put("newUsersLast7Days", users.stream()
                .filter(user -> user.getCreatedAt() != null
                        && user.getCreatedAt().isAfter(LocalDateTime.now().minusDays(7))).count());
        stats.put("daily", dailySeries(users, DAILY_SERIES_DAYS));
        return stats;
    }

    /**
     * Günlük kayıt ve doldurulma eğrisi. Boş günler de döner: istemci eksik
     * günü atlarsa grafik yanıltıcı biçimde düz görünüyor.
     */
    private List<Map<String, Object>> dailySeries(List<User> users, int days) {
        LocalDate start = LocalDate.now().minusDays(days - 1L);

        Map<LocalDate, Long> newUsers = users.stream()
                .filter(user -> user.getCreatedAt() != null
                        && !user.getCreatedAt().toLocalDate().isBefore(start))
                .collect(Collectors.groupingBy(user -> user.getCreatedAt().toLocalDate(),
                        Collectors.counting()));

        Map<LocalDate, Long> responses = surveyResponseRepository
                .findBySubmissionDateBetween(start.atStartOfDay(), LocalDateTime.now()).stream()
                .filter(response -> response.getSubmissionDate() != null)
                .collect(Collectors.groupingBy(response -> response.getSubmissionDate().toLocalDate(),
                        Collectors.counting()));

        return IntStream.range(0, days).mapToObj(offset -> {
            LocalDate day = start.plusDays(offset);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", day.toString());
            point.put("users", newUsers.getOrDefault(day, 0L));
            point.put("responses", responses.getOrDefault(day, 0L));
            return point;
        }).toList();
    }

    private AdminSurveyView view(SurveyTemplate template) {
        return AdminSurveyView.of(template,
                companyRepository.findById(template.getCompanyId()).map(Company::getName).orElse(null),
                companyOwner(template.getCompanyId()).map(User::getEmail).orElse(null),
                WARNING_GRACE_DAYS);
    }

    private Optional<User> companyOwner(String companyId) {
        if (companyId == null) {
            return Optional.empty();
        }
        return userRepository.findByCompanyIdAndRole(companyId, UserRole.COMPANY_OWNER.name())
                .stream().findFirst();
    }

    private Map<String, String> companyNames() {
        return companyRepository.findAll().stream()
                .filter(company -> company.getId() != null && company.getName() != null)
                .collect(Collectors.toMap(Company::getId, Company::getName, (a, b) -> a));
    }

    /** Anketi hazırlayan kullanıcıyı id'sinden e-postasına çevirmek için. */
    private Map<String, String> emailsByUserId() {
        return userRepository.findAll().stream()
                .filter(user -> user.getId() != null && user.getEmail() != null)
                .collect(Collectors.toMap(User::getId, User::getEmail, (a, b) -> a));
    }

    private Map<String, String> ownerEmailsByCompany() {
        return userRepository.findByRole(UserRole.COMPANY_OWNER.name()).stream()
                .filter(user -> user.getCompanyId() != null)
                .collect(Collectors.toMap(User::getCompanyId, User::getEmail, (a, b) -> a));
    }
}
