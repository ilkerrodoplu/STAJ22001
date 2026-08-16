package com.survey.ai.service;

import com.survey.ai.entity.User;
import com.survey.ai.enums.UserRole;
import com.survey.ai.repository.UserRepository;
import com.survey.ai.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest; // ✅ Jakarta EE import

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SecurityService {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    /**
     * Token geçerliliğini kontrol et
     */
    public boolean isValidToken(String bearerToken) {
        try {
            if (bearerToken == null || bearerToken.isEmpty()) {
                log.debug("Token is null or empty");
                return false;
            }

            String token = jwtTokenProvider.extractToken(bearerToken);

            if (token == null) {
                log.debug("Token extraction failed");
                return false;
            }

            boolean isValid = jwtTokenProvider.validateToken(token);

            if (!isValid) {
                log.debug("Token validation failed");
                return false;
            }

            String email = jwtTokenProvider.getEmailFromJWT(token);

            if (email == null) {
                log.debug("Email extraction from token failed");
                return false;
            }

            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                log.debug("User not found in database: {}", email);
                return false;
            }

            User user = userOpt.get();

            if (!user.isActive()) {
                log.debug("User is not active: {}", email);
                return false;
            }

            log.debug("Token validation successful for user: {}", email);
            return true;

        } catch (Exception e) {
            log.error("Token validation error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Kullanıcının şirkete sahip olup olmadığını kontrol et
     */
    public boolean userOwnsCompany(String bearerToken, String companyId) {
        try {
            if (!isValidToken(bearerToken)) {
                log.debug("Invalid token for company ownership check");
                return false;
            }

            String token = jwtTokenProvider.extractToken(bearerToken);
            String email = jwtTokenProvider.getEmailFromJWT(token);
            String tokenCompanyId = jwtTokenProvider.getCompanyIdFromJWT(token);

            if (!companyId.equals(tokenCompanyId)) {
                log.debug("Company ID mismatch. Token: {}, Requested: {}", tokenCompanyId, companyId);
                return false;
            }

            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return false;
            }

            User user = userOpt.get();
            boolean owns = user.getCompanyId().equals(companyId);
            log.debug("User {} owns company {}: {}", email, companyId, owns);

            return owns;

        } catch (Exception e) {
            log.error("Company ownership check error: {}", e.getMessage());
            return false;
        }
    }

    // ✅ Modern yaklaşım - Security Context kullan
    public Optional<User> getCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return Optional.empty();
            }

            String email = authentication.getName();
            return userRepository.findByEmail(email);

        } catch (Exception e) {
            log.error("Get current user error: {}", e.getMessage());
            return Optional.empty();
        }
    }

    // ✅ Request'ten token çıkarma - RequestContextHolder kullan
    public String getTokenFromCurrentRequest() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
            HttpServletRequest request = attributes.getRequest();
            return request.getHeader("Authorization");
        } catch (Exception e) {
            log.error("Error getting token from request: {}", e.getMessage());
            return null;
        }
    }

    // ✅ Current user'ın company ID'sini al
    public String getCurrentUserCompanyId() {
        try {
            Optional<User> userOpt = getCurrentUser();
            return userOpt.map(User::getCompanyId).orElse(null);
        } catch (Exception e) {
            log.error("Error getting current user company ID: {}", e.getMessage());
            return null;
        }
    }

    // ✅ Current user'ın ID'sini al
    public String getCurrentUserId() {
        try {
            Optional<User> userOpt = getCurrentUser();
            return userOpt.map(User::getId).orElse(null);
        } catch (Exception e) {
            log.error("Error getting current user ID: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Oturumdaki kullanıcının kendi şirketi dışındaki veriye erişmesini engeller.
     * Site admini muaftır (tüm şirketleri denetler).
     * <p>
     * CompanyScopeInterceptor yalnızca istekte {@code companyId} adlı yol
     * değişkeni/parametre varken çalışır. Kaynağı kendi id'siyle alan uçlarda
     * ({@code /v1/company/{id}}, {@code /v1/survey-templates/{id}}) interceptor
     * hiç devreye girmiyor; oralarda kontrol elle bu metotla yapılır.
     */
    public void requireOwnCompany(String companyId) {
        if (isCurrentUserAdmin()) {
            return;
        }

        String ownCompanyId = getCurrentUserCompanyId();
        if (ownCompanyId == null || !ownCompanyId.equals(companyId)) {
            log.warn("Sirket disi erisim engellendi: istenen={}, kullanicinin sirketi={}",
                    companyId, ownCompanyId);
            throw new org.springframework.security.access.AccessDeniedException(
                    "Bu veriye erişim yetkiniz yok");
        }
    }

    /**
     * Oturumdaki kullanıcı şirket sahibi mi. Site admini BURAYA DAHİL DEĞİLDİR:
     * süper admin şirket içeriğine dokunmaz, yalnızca denetler.
     */
    public boolean isCurrentUserCompanyOwner() {
        return hasRole(UserRole.COMPANY_OWNER);
    }

    /**
     * Anket oluşturma/düzenleme yetkisi: yalnızca şirket sahibi ve anket editörü.
     * Süper admin anket oluşturamaz/düzenleyemez (yalnızca uyarır).
     */
    public boolean canCurrentUserEditSurveys() {
        return isCurrentUserCompanyOwner() || hasRole(UserRole.SURVEY_EDITOR);
    }

    /** QR/link paylaşımı: şirket tarafındaki üç rol. Süper adminin QR üretme yetkisi yoktur. */
    public boolean canCurrentUserShareSurveys() {
        return canCurrentUserEditSurveys() || hasRole(UserRole.SURVEY_SHARER);
    }

    private boolean hasRole(UserRole role) {
        return getCurrentUser().map(user -> user.hasRole(role.name())).orElse(false);
    }

    // ✅ Admin kontrolü
    public boolean isCurrentUserAdmin() {
        try {
            Optional<User> userOpt = getCurrentUser();

            if (userOpt.isEmpty()) {
                return false;
            }

            User user = userOpt.get();
            return user.getRoles().contains("ROLE_ADMIN") ||
                    user.getRoles().contains("ADMIN");

        } catch (Exception e) {
            log.error("Admin check error: {}", e.getMessage());
            return false;
        }
    }
}