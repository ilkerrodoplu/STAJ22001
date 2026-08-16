package com.survey.ai.config;

import com.survey.ai.service.SecurityService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.Map;

/**
 * Oturumdaki kullanıcının kendi şirketi dışındaki veriye erişmesini engeller.
 * <p>
 * Uçların çoğu companyId'yi yol değişkeni ya da parametre olarak alıyor ve
 * bunu kimin istediğini kontrol etmiyordu: A şirketinin çalışanı, adresteki
 * companyId'yi değiştirerek B şirketinin raporlarını okuyabiliyordu. Kontrolü
 * 27 ayrı uca dağıtmak yerine tek yerde yapıyoruz; sonradan eklenen uçlar da
 * kendiliğinden korunur.
 * <p>
 * Site admini muaftır (tüm şirketleri denetler), oturumsuz istekler ise zaten
 * SecurityConfig'te eleniyor.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CompanyScopeInterceptor implements HandlerInterceptor {

    private static final String COMPANY_ID = "companyId";

    private final SecurityService securityService;

    @Override
    @SuppressWarnings("unchecked")
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String requestedCompanyId = request.getParameter(COMPANY_ID);

        if (requestedCompanyId == null) {
            Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
            if (variables instanceof Map<?, ?> map) {
                requestedCompanyId = (String) ((Map<String, Object>) map).get(COMPANY_ID);
            }
        }

        if (requestedCompanyId == null || requestedCompanyId.isBlank()) {
            return true;
        }

        // Oturumsuz istekler bu noktaya yalnızca açık uçlarda gelir.
        if (securityService.getCurrentUser().isEmpty()) {
            return true;
        }

        if (securityService.isCurrentUserAdmin()) {
            return true;
        }

        String ownCompanyId = securityService.getCurrentUserCompanyId();
        if (requestedCompanyId.equals(ownCompanyId)) {
            return true;
        }

        log.warn("Şirket dışı erişim engellendi: istenen={}, kullanıcının şirketi={}, yol={}",
                requestedCompanyId, ownCompanyId, request.getRequestURI());
        throw new AccessDeniedException("Bu veriye erişim yetkiniz yok");
    }
}
