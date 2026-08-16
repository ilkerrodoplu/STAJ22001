package com.survey.ai.config;

import com.survey.ai.entity.User;
import com.survey.ai.service.SecurityService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.servlet.HandlerMapping;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Kullanıcı adresteki companyId'yi değiştirerek başka şirketin verisine ulaşamaz.
 */
class CompanyScopeInterceptorTest {

    private final SecurityService securityService = mock(SecurityService.class);
    private final CompanyScopeInterceptor interceptor = new CompanyScopeInterceptor(securityService);
    private final MockHttpServletResponse response = new MockHttpServletResponse();

    @Test
    void baskaSirketin_verisi_istenirse_engellenir() {
        oturum("benim-sirketim");

        assertThatThrownBy(() -> interceptor.preHandle(pathRequest("baska-sirket"), response, null))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> interceptor.preHandle(paramRequest("baska-sirket"), response, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void kendi_sirketinin_verisi_serbesttir() {
        oturum("benim-sirketim");

        assertThat(interceptor.preHandle(pathRequest("benim-sirketim"), response, null)).isTrue();
        assertThat(interceptor.preHandle(paramRequest("benim-sirketim"), response, null)).isTrue();
    }

    @Test
    void siteAdmini_tum_sirketlere_erisir() {
        oturum("benim-sirketim");
        when(securityService.isCurrentUserAdmin()).thenReturn(true);

        assertThat(interceptor.preHandle(pathRequest("baska-sirket"), response, null)).isTrue();
    }

    @Test
    void companyId_tasimayan_istek_ve_anonim_akis_etkilenmez() {
        oturum("benim-sirketim");
        assertThat(interceptor.preHandle(new MockHttpServletRequest("GET", "/v1/users/profile"), response, null))
                .isTrue();

        // Anket doldurma gibi oturumsuz akışlar (açık uçlar) kontrol dışıdır.
        when(securityService.getCurrentUser()).thenReturn(Optional.empty());
        assertThat(interceptor.preHandle(pathRequest("herhangi-sirket"), response, null)).isTrue();
    }

    private void oturum(String companyId) {
        User user = new User();
        user.setCompanyId(companyId);
        when(securityService.getCurrentUser()).thenReturn(Optional.of(user));
        when(securityService.getCurrentUserCompanyId()).thenReturn(companyId);
    }

    private MockHttpServletRequest pathRequest(String companyId) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/reports/" + companyId);
        request.setAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE,
                Map.of("companyId", companyId));
        return request;
    }

    private MockHttpServletRequest paramRequest(String companyId) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/v1/reports/sentiments");
        request.setParameter("companyId", companyId);
        return request;
    }
}
