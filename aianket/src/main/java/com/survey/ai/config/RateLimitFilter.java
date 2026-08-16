package com.survey.ai.config;

import com.survey.ai.service.SecurityEventService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.CorsProcessor;
import org.springframework.web.cors.DefaultCorsProcessor;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IP başına basit istek sınırı: parola denemesi ve anket doldurma spam'i.
 *
 * ponytail: sayaçlar bellekte (tek örnek varsayımı) ve sabit pencereli. Birden
 * fazla backend örneği çalıştırılırsa ya da pencere sınırındaki iki katlı akış
 * sorun olursa Redis'e taşınmalı; o zamana kadar bağımlılık eklemeye değmez.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    /** CORS politikasının tek kaynağı; 429 yanıtına doğru başlıkları yazmak için. */
    private final CorsConfigurationSource corsConfigurationSource;

    private final CorsProcessor corsProcessor = new DefaultCorsProcessor();

    /** Bir uç kümesi için IP başına pencere içinde izin verilen istek sayısı. */
    private record Rule(String method, String pathPrefix, int limit, Duration window) {
        boolean matches(String method, String path) {
            return this.method.equals(method) && path.startsWith(pathPrefix);
        }
    }

    private static final List<Rule> RULES = List.of(
            // Giriş/kayıt/şifre sıfırlama.
            //
            // Tek hesabın parolasını deneme işini artık HESAP BAZLI kilit
            // durduruyor (bkz. AuthService: 5 denemede kilit, her kilitte süre
            // katlanıyor). Buradaki IP sınırının işi farklı: aynı adresten çok
            // sayıda FARKLI hesabın denenmesini (password spraying) yavaşlatmak.
            //
            // Bu yüzden sınır bilerek gevşek. 10 iken tek bir kullanıcının
            // şifresini karıştırması, aynı ofis/NAT arkasındaki herkesin giriş
            // yapmasını engelliyordu: kilit hesaba özel olmalı, adrese değil.
            new Rule("POST", "/v1/auth/", 50, Duration.ofMinutes(5)),
            // Anket doldurma. Sınır bilerek gevşek: mekânın ortak WiFi'sindeki
            // bütün masalar tek IP'den geliyor olabilir. Amaç yoğun bir mekânı
            // engellemek değil, script'le binlerce yanıt basılmasını durdurmak.
            new Rule("POST", "/v1/survey-responses", 60, Duration.ofHours(1)),
            // Panelin bildirdiği sayfa denemesi. Uç anonime açık olduğu için
            // sınırsız bırakılırsa süper adminin bildirim listesi tek IP'den
            // doldurulabilir. Sınır bilerek yüksek: sınıra takılan istek kayda
            // hiç düşmüyor, yani dar bir sınır asıl görmek istediğimiz denemeyi
            // sessizce yutuyor. Panelin tamamı tek proxy/NAT arkasından tek IP
            // olarak göründüğü için 20 kolayca doluyordu.
            new Rule("POST", "/v1/security-events/page-denied", 60, Duration.ofHours(1)));

    /**
     * Kimlik denenen uçlar. Hatalı deneme sayacı YALNIZCA bunlarda işler;
     * şifre sıfırlama açık kalmalı, aksi halde sınıra takılan gerçek kullanıcının
     * kendini kurtarma yolu da kapanırdı.
     */
    private static final List<String> CREDENTIAL_PATHS = List.of("/v1/auth/login", "/v1/auth/reactivate");

    /**
     * IP başına hatalı kimlik denemesi (401) sınırı.
     * <p>
     * Hesap kilidi E-POSTA bazlıdır: kilitli hesabın adresinde bir harf değiştiren
     * kişi her seferinde "başka bir hesabı" denemiş olur, kayıtlı olmayan adreste
     * sayılacak bir kullanıcı kaydı da bulunmadığı için hiçbir sayaca takılmadan
     * sınırsız deneme yapabiliyordu. Bu sayaç e-postadan bağımsız, adrese göre işler.
     * <p>
     * Yalnızca BAŞARISIZ denemeler sayılır: başarılı giriş kota harcamaz, yani
     * aynı NAT arkasındaki ofis normal çalışırken bu sınırı hiç görmez. 20 sayısı
     * hesap kilidinin dört katıdır (5 deneme x 4 hesap); gerçek kullanıcı kendi
     * hesabında zaten 5'te kilide takılır.
     */
    private static final int MAX_FAILED_CREDENTIALS = 20;
    private static final Duration FAILED_CREDENTIAL_WINDOW = Duration.ofMinutes(15);
    private static final String FAILED_CREDENTIAL_KEY = "hatali-giris";

    /** Bu sayıyı aşınca süresi dolmuş kayıtlar temizlenir; harita sınırsız büyümesin. */
    private static final int CLEANUP_THRESHOLD = 10_000;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    private static final class Window {
        long resetAt;
        int count;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        // getServletPath: context-path (/api) çıkarılmış hâli; kurallar /v1/... yazılır.
        String path = request.getServletPath();
        String ip = SecurityEventService.clientIp(request);
        boolean credentialAttempt = "POST".equals(request.getMethod()) && CREDENTIAL_PATHS.contains(path);
        String failedKey = FAILED_CREDENTIAL_KEY + "|" + ip;

        // Hatalı deneme kotası dolduysa giriş uçları kapanır; e-posta değiştirmek
        // bu sayacı sıfırlamaz, çünkü sayaç adrese bağlıdır.
        if (credentialAttempt && exhausted(failedKey, MAX_FAILED_CREDENTIALS)) {
            reject(request, response, failedKey, FAILED_CREDENTIAL_WINDOW, ip, path);
            return;
        }

        Rule rule = RULES.stream()
                .filter(candidate -> candidate.matches(request.getMethod(), path))
                .findFirst()
                .orElse(null);

        if (rule != null && bump(rule.pathPrefix() + "|" + ip, rule.window()) > rule.limit()) {
            reject(request, response, rule.pathPrefix() + "|" + ip, rule.window(), ip, path);
            return;
        }

        chain.doFilter(request, response);

        // 401 = e-posta/şifre tutmadı. Başarılı giriş ve kilit yanıtı (423)
        // sayılmaz: kota yalnızca gerçek deneme yapan tarafından harcanır.
        if (credentialAttempt && response.getStatus() == 401) {
            bump(failedKey, FAILED_CREDENTIAL_WINDOW);
        }
    }

    /** Sınıra takılan isteğin 429 yanıtı; iki sayaç da aynı gövdeyi döndürür. */
    private void reject(HttpServletRequest request, HttpServletResponse response,
                        String key, Duration window, String ip, String path) throws IOException {
        log.warn("ISTEK SINIRI ASILDI | ip={} | {} {}", ip, request.getMethod(), path);

        // CORS başlıkları ELLE eklenir. Bu filtre zincirin en başında çalışıp
        // isteği kısa devre yaptığı için Spring Security'nin CORS filtresi hiç
        // çalışmıyor; başlıksız yanıtı tarayıcı okuyamıyor ve kullanıcıya
        // sınıra takıldığı değil "sunucuya ulaşılamadı" diye gösteriliyordu.
        // Politika tek kaynaktan (CorsConfig) gelir, burada kopyalanmaz.
        writeCorsHeaders(request, response);

        long retryAfterSeconds = retryAfterSeconds(key, window);

        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setContentType("application/json;charset=UTF-8");
        // code + secondsLeft: panel bunu hesap kilidiyle aynı geri sayım
        // ekranında gösteriyor (bkz. useAccountLock).
        response.getWriter().write(String.format(
                "{\"status\":429,\"code\":\"TOO_MANY_REQUESTS\",\"secondsLeft\":%d,"
                        + "\"message\":\"Çok fazla deneme yapıldı. Güvenlik için bir süre beklemeniz gerekiyor.\"}",
                retryAfterSeconds));
    }

    /** Pencerenin bitmesine kalan gerçek süre; sabit pencere uzunluğu değil. */
    private long retryAfterSeconds(String key, Duration ruleWindow) {
        Window window = windows.get(key);
        if (window == null) {
            return ruleWindow.toSeconds();
        }
        long left = (window.resetAt - System.currentTimeMillis() + 999) / 1000;
        return Math.max(left, 1);
    }

    private void writeCorsHeaders(HttpServletRequest request, HttpServletResponse response) {
        try {
            CorsConfiguration configuration = corsConfigurationSource.getCorsConfiguration(request);
            if (configuration != null) {
                corsProcessor.processRequest(configuration, request, response);
            }
        } catch (Exception e) {
            // Başlık yazılamazsa da 429 yanıtı verilmeli.
            log.warn("İstek sınırı yanıtına CORS başlıkları eklenemedi: {}", e.getMessage());
        }
    }

    /** Sayacı bir artırır (pencere dolmuşsa yenisini açar) ve yeni değeri döner. */
    private int bump(String key, Duration ruleWindow) {
        long now = System.currentTimeMillis();

        if (windows.size() > CLEANUP_THRESHOLD) {
            windows.entrySet().removeIf(entry -> entry.getValue().resetAt <= now);
        }

        // compute anahtar bazında atomik; sayacı dışarıda okumak en fazla bir
        // isteklik kayma yaratır, sınırın amacı için önemsiz.
        return windows.compute(key, (k, existing) -> {
            if (existing == null || existing.resetAt <= now) {
                Window fresh = new Window();
                fresh.resetAt = now + ruleWindow.toMillis();
                fresh.count = 1;
                return fresh;
            }
            existing.count++;
            return existing;
        }).count;
    }

    /** Sayacı ARTIRMADAN okur: kota dolu mu? Süresi dolmuş pencere engel değildir. */
    private boolean exhausted(String key, int limit) {
        Window window = windows.get(key);
        return window != null && window.resetAt > System.currentTimeMillis() && window.count >= limit;
    }
}
