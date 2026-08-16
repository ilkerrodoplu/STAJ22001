package com.survey.ai.controller;

import com.survey.ai.entity.SecurityEvent;
import com.survey.ai.service.SecurityEventService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.security.Principal;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Denetim listesine yalnızca gerçek sinyal düşmeli: oturumu olan kullanıcının
 * yetkisi dışındaki sayfayı denemesi. Oturumsuz bildirim kayıt açmaz; aksi halde
 * çıkış yapan kullanıcının açık sayfası "kayıtsız ziyaretçi denemesi" oluyordu.
 */
class SecurityEventControllerTest {

    private final SecurityEventService service = mock(SecurityEventService.class);
    private final SecurityEventController controller = new SecurityEventController(service);

    @Test
    void oturumsuz_bildirim_kayit_acmaz() {
        controller.pageDenied(Map.of("page", "/admin/super/users"), request(false));

        verify(service, never()).record(any(), any(), any(), any());
    }

    @Test
    void oturumlu_kullanicinin_denemesi_kaydedilir() {
        controller.pageDenied(Map.of("page", "/admin/super/users", "section", "Şirket Sahibi"),
                request(true));

        verify(service).record(any(), eq(SecurityEvent.FORBIDDEN),
                eq("Panelde yetkisiz sayfa denemesi (Şirket Sahibi)"), eq("/admin/super/users"));
    }

    /** Gövdeye rastgele yol yazılıp denetim listesi şişirilemez. */
    @Test
    void panel_disi_yol_kaydedilmez() {
        controller.pageDenied(Map.of("page", "https://baska-site.example"), request(true));

        verify(service, never()).record(any(), any(), any(), any());
    }

    private MockHttpServletRequest request(boolean authenticated) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST",
                "/api/v1/security-events/page-denied");
        if (authenticated) {
            Principal principal = () -> "calisan@firma.com";
            request.setUserPrincipal(principal);
        }
        return request;
    }
}
