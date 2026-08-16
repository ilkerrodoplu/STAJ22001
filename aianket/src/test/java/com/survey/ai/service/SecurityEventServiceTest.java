package com.survey.ai.service;

import com.survey.ai.entity.SecurityEvent;
import com.survey.ai.entity.User;
import com.survey.ai.repository.SecurityEventRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Yetkisiz erişimde kim/nereden/hangi sayfa bilgisi kaydedilir; oturumsuz
 * kullanıcıda kimlik yerine IP tutulur.
 */
class SecurityEventServiceTest {

    private final SecurityEventRepository repository = mock(SecurityEventRepository.class);
    private final SecurityService securityService = mock(SecurityService.class);
    private final SecurityEventService service = new SecurityEventService(repository, securityService);

    @Test
    void oturumlu_kullanicinin_kimligi_kaydedilir() {
        User user = new User();
        user.setId("u1");
        user.setEmail("calisan@firma.com");
        user.setName("Test");
        user.setLastName("Calisan");
        user.setCompanyId("c1");
        when(securityService.getCurrentUser()).thenReturn(Optional.of(user));

        service.record(request("/api/v1/admin/users", "http://localhost:3000/admin/super/users"),
                SecurityEvent.FORBIDDEN, "Rol yetersiz");

        SecurityEvent saved = captureSaved();
        assertThat(saved.getUserEmail()).isEqualTo("calisan@firma.com");
        assertThat(saved.getUserName()).isEqualTo("Test Calisan");
        assertThat(saved.getPath()).isEqualTo("/api/v1/admin/users");
        assertThat(saved.getPage()).isEqualTo("http://localhost:3000/admin/super/users");
        assertThat(saved.getType()).isEqualTo(SecurityEvent.FORBIDDEN);
        assertThat(saved.actorLabel()).isEqualTo("calisan@firma.com");
    }

    @Test
    void anonim_istekte_IP_kaydedilir() {
        when(securityService.getCurrentUser()).thenReturn(Optional.empty());

        service.record(request("/api/v1/company", null), SecurityEvent.UNAUTHENTICATED, "Oturum yok");

        SecurityEvent saved = captureSaved();
        assertThat(saved.getUserEmail()).isNull();
        assertThat(saved.getIp()).isEqualTo("203.0.113.9");
        assertThat(saved.actorLabel()).isEqualTo("Anonim (203.0.113.9)");
    }

    /** Panelin bildirdiği sayfa denemesinde uç adresi değil, denenen sayfa yazılır. */
    @Test
    void panel_sayfasi_bildirildiginde_path_o_sayfadir() {
        when(securityService.getCurrentUser()).thenReturn(Optional.empty());

        service.record(request("/api/v1/security-events/page-denied", null),
                SecurityEvent.FORBIDDEN, "Panelde yetkisiz sayfa denemesi", "/admin/super/users");

        assertThat(captureSaved().getPath()).isEqualTo("/admin/super/users");
    }

    @Test
    void kayit_hatasi_asil_yaniti_bozmaz() {
        when(securityService.getCurrentUser()).thenReturn(Optional.empty());
        when(repository.save(any())).thenThrow(new RuntimeException("mongo kapalı"));

        // İstisna dışarı sızmamalı.
        service.record(request("/api/v1/company", null), SecurityEvent.UNAUTHENTICATED, "Oturum yok");
    }

    private SecurityEvent captureSaved() {
        ArgumentCaptor<SecurityEvent> captor = ArgumentCaptor.forClass(SecurityEvent.class);
        verify(repository).save(captor.capture());
        return captor.getValue();
    }

    /** Proxy arkasındaki gerçek IP X-Forwarded-For ilk değeridir. */
    private MockHttpServletRequest request(String path, String referer) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("X-Forwarded-For", "203.0.113.9, 10.0.0.1");
        if (referer != null) {
            request.addHeader("Referer", referer);
        }
        return request;
    }
}
