package com.survey.ai.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Giriş uçlarında IP başına istek sınırı ve 429 yanıtının biçimi. */
class RateLimitFilterTest {

    /** application.properties'teki kuralla aynı: /v1/auth/ için 5 dakikada 50 istek. */
    private static final int AUTH_LIMIT = 50;

    /** Prod ile aynı politika: yalnızca panelin adresine izin verilir. */
    private static CorsConfigurationSource corsSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(List.of("POST"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private final RateLimitFilter filter = new RateLimitFilter(corsSource());

    /** IP sınırı yalnızca toplu deneme içindir: sınırı aşan IP durur, diğeri etkilenmez. */
    @Test
    void sinirAsanIp_reddedilir_digerIpEtkilenmez() throws Exception {
        for (int i = 1; i <= AUTH_LIMIT; i++) {
            assertThat(login("1.2.3.4").getStatus()).isEqualTo(200);
        }

        MockHttpServletResponse blocked = login("1.2.3.4");
        assertThat(blocked.getStatus()).isEqualTo(429);
        // Kalan gerçek süre döner; pencere 5 dakika olduğu için 300'e çok yakın.
        assertThat(Integer.parseInt(blocked.getHeader("Retry-After"))).isBetween(295, 300);

        assertThat(login("5.6.7.8").getStatus()).isEqualTo(200);
    }

    /**
     * Tek kullanıcının şifresini karıştırması, aynı adresten giren diğer
     * kullanıcıları engellememelidir. Parola deneme işini hesap bazlı kilit
     * yapıyor (AuthService); IP sınırı yalnızca toplu denemeye karşı ve bu
     * yüzden bilerek gevşek. Sınır 10 iken tek bir kullanıcı birkaç yanlış
     * denemede tüm ofisin kotasını bitiriyordu.
     */
    @Test
    void ayniAdresten_birkac_kullanicinin_hatali_denemesi_digerlerini_engellemez() throws Exception {
        // 5 kullanıcı x hesap kilidine kadar 5 deneme = 25 istek
        for (int kullanici = 0; kullanici < 5; kullanici++) {
            for (int deneme = 0; deneme < 5; deneme++) {
                assertThat(login("10.0.0.1").getStatus()).isEqualTo(200);
            }
        }

        // Altıncı kullanıcı hâlâ giriş yapabilmeli.
        assertThat(login("10.0.0.1").getStatus()).isEqualTo(200);
    }

    /**
     * 429 yanıtı CORS başlığı taşımalı. Bu filtre zincirin başında kısa devre
     * yaptığı için Spring Security'nin CORS filtresi çalışmıyor; başlıksız yanıtı
     * tarayıcı okuyamıyor ve kullanıcı sınıra takıldığını göremeden "sunucuya
     * ulaşılamadı" hatası alıyordu.
     */
    @Test
    void istekSiniriYaniti_corsBasligiTasir_ve_kalanSureyiBildirir() throws Exception {
        for (int i = 1; i <= AUTH_LIMIT; i++) {
            loginFromBrowser("9.9.9.9");
        }

        MockHttpServletResponse blocked = loginFromBrowser("9.9.9.9");

        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getHeader("Access-Control-Allow-Origin")).isEqualTo("http://localhost:3000");
        assertThat(blocked.getContentAsString())
                .contains("\"code\":\"TOO_MANY_REQUESTS\"")
                .contains("\"secondsLeft\":");
    }

    private MockHttpServletResponse loginFromBrowser(String ip) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/v1/auth/login");
        request.setServletPath("/v1/auth/login");
        request.setRemoteAddr(ip);
        request.addHeader("Origin", "http://localhost:3000");

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    /**
     * Hesap kilidi e-posta bazlıdır: kilitli hesabın adresinde bir harf değiştiren
     * kişi "başka bir hesabı" denemiş sayılıyor ve kayıtlı olmayan adreste sayılacak
     * kullanıcı kaydı da olmadığı için sınırsız deneme yapabiliyordu. Hatalı deneme
     * sayacı ADRESE bağlı olduğu için gövdedeki e-postanın değişmesi onu sıfırlamaz.
     */
    @Test
    void hatali_denemeler_eposta_degistirilse_de_ip_bazinda_sayilir() throws Exception {
        for (int i = 1; i <= 20; i++) {
            assertThat(failedLogin("7.7.7.7").getStatus()).isEqualTo(401);
        }

        MockHttpServletResponse blocked = failedLogin("7.7.7.7");
        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getContentAsString()).contains("\"code\":\"TOO_MANY_REQUESTS\"");

        // Sınır adrese özeldir: başka bir adresten giriş etkilenmez.
        assertThat(failedLogin("8.8.8.8").getStatus()).isEqualTo(401);
    }

    /** Başarılı girişler kota harcamaz: aynı NAT arkasındaki ofis sınırı hiç görmez. */
    @Test
    void basarili_girisler_hatali_deneme_kotasini_harcamaz() throws Exception {
        for (int i = 0; i < 30; i++) {
            assertThat(login("11.11.11.11").getStatus()).isEqualTo(200);
        }

        assertThat(failedLogin("11.11.11.11").getStatus()).isEqualTo(401);
    }

    /** Şifre sıfırlama kapanmamalı: sınıra takılan kullanıcının kurtulma yolu odur. */
    @Test
    void hatali_deneme_siniri_sifre_sifirlamayi_kapatmaz() throws Exception {
        for (int i = 0; i < 25; i++) {
            failedLogin("12.12.12.12");
        }

        assertThat(request("POST", "/v1/auth/forgot-password", "12.12.12.12").getStatus()).isEqualTo(200);
    }

    /** Yanıtı 401 olan giriş isteği; sayaç yalnızca başarısız denemeyi sayar. */
    private MockHttpServletResponse failedLogin(String ip) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/v1/auth/login");
        request.setServletPath("/v1/auth/login");
        request.setRemoteAddr(ip);

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> ((MockHttpServletResponse) res).setStatus(401));
        return response;
    }

    @Test
    void sinirliOlmayanUc_engellenmez() throws Exception {
        for (int i = 0; i < 50; i++) {
            assertThat(request("GET", "/v1/company", "1.2.3.4").getStatus()).isEqualTo(200);
        }
    }

    private MockHttpServletResponse login(String ip) throws Exception {
        return request("POST", "/v1/auth/login", ip);
    }

    private MockHttpServletResponse request(String method, String path, String ip) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setServletPath(path);
        request.setRemoteAddr(ip);

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }
}
