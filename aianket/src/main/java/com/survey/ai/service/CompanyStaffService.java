package com.survey.ai.service;

import com.survey.ai.dto.InviteCode;
import com.survey.ai.dto.UserResponse;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.SurveyTemplate;
import com.survey.ai.entity.User;
import com.survey.ai.enums.UserRole;
import com.survey.ai.exception.ResourceNotFoundException;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.SurveyTemplateRepository;
import com.survey.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Şirket sahibinin çalışan yönetimi: kayıt kodu, katılma onayı ve rol atama.
 * Çalışan hesabını sahip açmaz; çalışan kayıt kodu ile kendi hesabını açar,
 * sahip de katılımı onaylar.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyStaffService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final SecurityService securityService;
    private final AuditService auditService;
    private final SurveyTemplateRepository surveyTemplateRepository;
    private final SurveyNotificationService notificationService;

    /**
     * Kayıt kodu yalnızca şirket sahibine gösterilir. Kod kısa ömürlüdür: süresi
     * dolmuşsa (ya da hiç üretilmemişse) burada yenilenir, kalan süre ekranda
     * saniye olarak gösterilir.
     */
    public InviteCode getOrCreateInviteCode() {
        Company company = ownedCompany();
        if (company.getInviteCode() == null || company.getInviteCode().isBlank()
                || InviteCode.expired(company.getInviteCodeUpdatedAt())
                || InviteCode.usedUp(company.getInviteCodeUses())) {
            return rotate(company);
        }
        return InviteCode.of(company.getInviteCode(), company.getInviteCodeUpdatedAt());
    }

    /** Kod başkasının eline geçtiyse süresi dolmadan da yenilenebilir. */
    public InviteCode regenerateInviteCode() {
        Company company = ownedCompany();
        log.info("{} şirketinin çalışan kayıt kodu yenilendi", company.getId());
        return rotate(company);
    }

    private InviteCode rotate(Company company) {
        LocalDateTime now = LocalDateTime.now();
        company.setInviteCode(Company.newInviteCode());
        company.setInviteCodeUpdatedAt(now);
        company.setInviteCodeUses(0);
        company.setUpdatedAt(now);
        companyRepository.save(company);
        return InviteCode.of(company.getInviteCode(), now);
    }

    /** Şirketin sahibi dışındaki kullanıcıları. */
    public List<UserResponse> listStaff() {
        String companyId = ownedCompany().getId();
        return userRepository.findByCompanyId(companyId).stream()
                .filter(user -> !user.hasRole(UserRole.COMPANY_OWNER.name()))
                .map(UserResponse::from)
                .toList();
    }

    /**
     * Çalışana rol atar. Sahip rolü buradan verilemez; şirketin tek sahibi
     * kayıt olan kullanıcıdır.
     */
    public UserResponse assignRole(String userId, String roleName) {
        UserRole role = parseStaffRole(roleName);
        User staff = staffOfOwnedCompany(userId);

        staff.setRoles(new HashSet<>(Set.of(role.name())));
        staff.setUpdatedAt(LocalDateTime.now());
        auditService.record(AuditService.ROLE_ASSIGNED, staff.getEmail(), "yeni rol: " + role.name());
        return UserResponse.from(userRepository.save(staff));
    }

    /** Sahip onayı: çalışan artık rolünün sayfalarını görür. */
    public UserResponse approveStaff(String userId) {
        User staff = staffOfOwnedCompany(userId);
        staff.setMembershipStatus("APPROVED");
        staff.setUpdatedAt(LocalDateTime.now());
        auditService.record(AuditService.STAFF_APPROVED, staff.getEmail(), "şirket: " + staff.getCompanyId());
        return UserResponse.from(userRepository.save(staff));
    }

    /**
     * Sahip reddi: hesap silinmez, yalnızca şirket bağı kurulmaz. Kullanıcı
     * başka bir şirketin kayıt koduyla katılabilir.
     */
    public void rejectStaff(String userId) {
        User staff = staffOfOwnedCompany(userId);
        String companyId = staff.getCompanyId();
        detach(staff);
        auditService.record(AuditService.STAFF_REJECTED, staff.getEmail(), "şirket: " + companyId);
    }

    /**
     * Çalışanı şirketten çıkarır: hesap silinmez, yalnızca şirket bağı kopar.
     * Hazırladığı anketler şirkette kalır; sahipliği şirket sahibine geçer.
     */
    public void removeStaff(String userId) {
        User staff = staffOfOwnedCompany(userId);
        String companyId = staff.getCompanyId();

        transferSurveysToOwner(companyId, staff.getId());
        detach(staff);
        auditService.record(AuditService.STAFF_REMOVED, staff.getEmail(), "şirket: " + companyId);
    }

    /**
     * Şirketsiz kullanıcının (çıkarılan ya da isteği reddedilen çalışan) yeni
     * şirkete katılması: yalnızca kayıt kodu istenir, hesap yeniden açılmaz.
     * Katılım yine sahibin onayına düşer.
     */
    public UserResponse join(String inviteCode) {
        User user = securityService.getCurrentUser()
                .orElseThrow(() -> new AccessDeniedException("Oturum bulunamadı, lütfen tekrar giriş yapın"));
        if (user.getCompanyId() != null) {
            throw new IllegalStateException("Zaten bir şirkete bağlısınız");
        }
        // Süper adminin şirketi yoktur; kayıt kodu girerse rolünü kaybederdi.
        if (user.hasRole(UserRole.ADMIN.name())) {
            throw new AccessDeniedException("Süper admin hesabı şirkete bağlanamaz");
        }

        // Locale.ROOT şart: Türkçe locale'de "i" harfi "İ" oluyor ve kod eşleşmiyor.
        String code = inviteCode.trim().toUpperCase(Locale.ROOT);
        Company company = companyRepository.findByInviteCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Şirket", "kayıt kodu", inviteCode));
        InviteCode.requireUsable(company.getInviteCodeUpdatedAt(), company.getInviteCodeUses());
        company.setInviteCodeUses(company.getInviteCodeUses() + 1);
        companyRepository.save(company);

        user.setCompanyId(company.getId());
        user.setRoles(new HashSet<>(Set.of(UserRole.COMPANY_STAFF.name())));
        user.setMembershipStatus("PENDING");
        user.setUpdatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);

        notificationService.notifyJoinRequest(company.getId(), saved);
        auditService.record(AuditService.STAFF_JOIN_REQUESTED, saved.getEmail(), "şirket: " + company.getName());
        log.info("{} şirketine katılma isteği: {}", company.getId(), saved.getEmail());
        return UserResponse.from(saved);
    }

    /** Şirket bağını koparır; hesap açık kalır, kullanıcı yeni şirkete katılabilir. */
    private void detach(User staff) {
        staff.setCompanyId(null);
        staff.setRoles(new HashSet<>());
        staff.setMembershipStatus(null);
        staff.setUpdatedAt(LocalDateTime.now());
        userRepository.save(staff);
    }

    /**
     * Çıkarılan çalışanın hazırladığı anketler şirkette kalır; sahipliği şirket
     * sahibine geçer. Aksi halde anketler şirketten ayrılmış bir kullanıcıya
     * bağlı kalırdı.
     */
    private void transferSurveysToOwner(String companyId, String staffId) {
        String ownerId = securityService.getCurrentUserId();
        List<SurveyTemplate> devredilen = new ArrayList<>();
        for (SurveyTemplate template : surveyTemplateRepository.findByCompanyId(companyId)) {
            if (staffId.equals(template.getCreatedBy())) {
                template.setCreatedBy(ownerId);
                devredilen.add(template);
            }
        }
        if (!devredilen.isEmpty()) {
            surveyTemplateRepository.saveAll(devredilen);
            log.info("{} anketin sahipliği şirkete devredildi ({})", devredilen.size(), companyId);
        }
    }

    /** İşlemi yapan sahibin şirketine bağlı çalışan; değilse erişim yok. */
    private User staffOfOwnedCompany(String userId) {
        String companyId = ownedCompany().getId();

        User staff = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı", "id", userId));

        if (!companyId.equals(staff.getCompanyId()) || staff.hasRole(UserRole.COMPANY_OWNER.name())) {
            throw new AccessDeniedException("Bu kullanıcı şirketinizin çalışanı değil");
        }
        return staff;
    }

    private UserRole parseStaffRole(String roleName) {
        try {
            UserRole role = UserRole.valueOf(roleName);
            if (!UserRole.ASSIGNABLE_STAFF_ROLES.contains(role)) {
                throw new IllegalArgumentException();
            }
            return role;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Geçersiz çalışan rolü: " + roleName);
        }
    }

    /** İşlemi yapan kullanıcının sahibi olduğu şirket; sahip değilse erişim yok. */
    private Company ownedCompany() {
        if (!securityService.isCurrentUserCompanyOwner()) {
            throw new AccessDeniedException("Çalışan yönetimi yalnızca şirket sahibine açıktır");
        }
        String companyId = securityService.getCurrentUserCompanyId();
        if (companyId == null) {
            throw new AccessDeniedException("Hesabınız bir şirkete bağlı değil");
        }
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Şirket", "id", companyId));
    }
}
