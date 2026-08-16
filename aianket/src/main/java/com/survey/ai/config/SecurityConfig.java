
package com.survey.ai.config;

import com.survey.ai.entity.SecurityEvent;
import com.survey.ai.security.JwtAuthenticationEntryPoint;
import com.survey.ai.security.JwtAuthenticationFilter;
import com.survey.ai.service.SecurityEventService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    /** Yetkisiz erişim denetim kaydı; @Lazy döngüsel bağımlılığı önler. */
    @Autowired
    @org.springframework.context.annotation.Lazy
    private SecurityEventService securityEventService;

    @Autowired
    private CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CORS yapılandırması - CorsConfig'den gelen bean'i kullan
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                // CSRF devre dışı bırakılıyor (REST API için genellikle gerekli değil)
                .csrf(AbstractHttpConfigurer::disable)
                // Kimlik doğrulama hatası işleme
                .exceptionHandling(exceptionHandling -> exceptionHandling
                        // Oturum yok/geçersiz -> 401
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        // Oturum var ama rol yetmiyor -> 403. 401 dönerse istemci
                        // token'ı geçersiz sanıp kullanıcıyı çıkışa atıyordu.
                        .accessDeniedHandler((request, response, ex) -> {
                            securityEventService.record(request, SecurityEvent.FORBIDDEN,
                                    "Rol yetersiz: " + request.getMethod() + " " + request.getRequestURI());
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write(
                                    "{\"status\":403,\"message\":\"Bu işlem için yetkiniz yok\"}");
                        })
                )
                // Oturum yönetimi - REST API için durumsuz (stateless)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                // HTTP isteklerini yetkilendirme
                // Kural: varsayılan KAPALI. Yalnızca anket doldurma, kayıt/giriş ve
                // ödeme sağlayıcısının çağırdığı uçlar anonime açıktır. Önceki
                // "/v1/** permitAll" kuralı raporları ve şirket listesini oturumsuz
                // erişime açık bırakıyordu.
                .authorizeHttpRequests(authorize -> authorize
                        // CORS preflight. DİKKAT: requestMatchers("OPTIONS", "/**") YAZILMAZ;
                        // o çağrı HttpMethod overload'una değil requestMatchers(String...)
                        // overload'una gider ve "/**" deseniyle TÜM API'yi anonime açar.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        /* ---------- Anonim erişime AÇIK uçlar ---------- */

                        // Giriş, kayıt, şifre sıfırlama
                        .requestMatchers("/v1/auth/**").permitAll()
                        // Kayıt formundaki şirket türü listesi
                        .requestMatchers(HttpMethod.GET, "/v1/company/types").permitAll()
                        // QR ile gelen katılımcının anketi çözmesi ve doldurması
                        .requestMatchers(HttpMethod.GET, "/v1/qr-codes/survey-info/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/survey-responses").permitAll()
                        // Panelin kapattığı sayfa denemesini bildiren uç artık oturum
                        // ister: kaydedilen tek şey, oturumu olan kullanıcının yetkisi
                        // dışındaki sayfayı denemesi. Oturumsuz bildirim zaten kayda
                        // geçmiyordu, anonim erişime açık kalması gereksizdi.
                        // Ödeme sağlayıcısının sunucudan çağırdığı geri bildirim ve yönlendirmeler
                        .requestMatchers("/v1/payments/paytr/callback").permitAll()
                        .requestMatchers("/payment/**").permitAll()

                        .requestMatchers("/public/**").permitAll()
                        .requestMatchers("/ping").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/swagger**", "/swagger-ui/**", "/api-docs/**").permitAll()
                        .requestMatchers("/api/swagger-ui/**", "/api/api-docs/**", "/api/api-docs.yaml",
                                "/api/swagger-ui.html", "/api/swagger-resources/**", "/api/webjars/**").permitAll()

                        /* ---------- Role bağlı uçlar ---------- */

                        // Süper admin paneli yalnızca site admininde.
                        .requestMatchers("/v1/admin/**").hasAuthority("ADMIN")

                        // Müşteri verisi (yanıt, rapor, yorum, bildirim) şirket
                        // sahibinde ve görüntüleme yetkili çalışanda. Anket
                        // hazırlayan/paylaşan kendi işini yapar; panelde bu
                        // sayfalar kapalı olduğu gibi uçlar da kapalı olmalı.
                        .requestMatchers("/v1/survey-responses/company/**",
                                "/v1/survey-reports/**",
                                "/v1/reports/**",
                                "/v1/notifications/**")
                        .hasAnyAuthority("ADMIN", "COMPANY_OWNER", "COMPANY_STAFF")

                        // Site yönetimiyle yazışma şirket adınadır; sahibin işidir.
                        .requestMatchers("/v1/messages/**").hasAnyAuthority("COMPANY_OWNER")

                        // Şirkete katılma isteği: şirketsiz kullanıcının erişebildiği
                        // tek şirket ucu. Aşağıdaki "/v1/company/**" kuralından ÖNCE
                        // gelmeli, aksi halde rol istenip erişilemez olurdu.
                        .requestMatchers(HttpMethod.POST, "/v1/company/staff/join").authenticated()

                        // Şirketsiz kullanıcı kendi şirketini kurabilir; rolü henüz yok.
                        .requestMatchers(HttpMethod.POST, "/v1/company/found").authenticated()

                        // NOT: "/v1/survey-templates/*" GET'i anonime AÇIK DEĞİLDİR.
                        // Açıkken pasif ve süper adminin askıya aldığı şablonlar dahil
                        // her anket oturumsuz okunabiliyordu. Anket doldurma ekranının
                        // buna ihtiyacı yok; oturumsuz iki yolu var (ikisi de yukarıdaki
                        // permitAll kurallarına giriyor):
                        //   - /v1/qr-codes/survey-info/{encodedData}: şablon + şirket
                        //   - /public/survey-templates/{id}: yalnızca YAYINDAKİ şablon
                        //     (bkz. PublicSurveyTemplateController)

                        // Şirket verisi rol ister. Katılımı onay bekleyen çalışanın rolü
                        // işlemez (bkz. CustomUserDetails), bu yüzden bu uçların hepsi ona
                        // kapalıdır; yalnızca profil ve ayarlar uçlarına erişir.
                        .requestMatchers("/v1/survey-templates/**", "/v1/qr-codes/**",
                                "/v1/company/**", "/v1/surveys/**", "/v1/ai/**",
                                "/v1/ready-survey-templates/**")
                        .hasAnyAuthority("ADMIN", "COMPANY_OWNER", "COMPANY_STAFF",
                                "SURVEY_EDITOR", "SURVEY_SHARER")

                        // Diğer tüm istekler kimlik doğrulaması gerektirir
                        .anyRequest().authenticated()
                )
                // JWT filtresi ekleniyor
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(authProvider);
    }
}
