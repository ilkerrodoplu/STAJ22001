
package com.survey.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Value("${app.cors.allowed-methods:GET,POST,PUT,DELETE,OPTIONS,HEAD,PATCH}")
    private String allowedMethods;

    @Value("${app.cors.allow-credentials:true}")
    private boolean allowCredentials;

    @Value("${app.cors.max-age:3600}")
    private long maxAge;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Origins - virgülle ayrılmış string'i list'e çevir. Tek kaynak burasıdır;
        // controller'lardaki @CrossOrigin(origins="*") kaldırıldı. "*" kalıbı da
        // kaldırıldı: allowCredentials ile birlikte her siteye kimlikli istek
        // hakkı veriyordu, yani CORS fiilen kapalıydı.
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        configuration.setAllowedOrigins(origins);

        // Methods
        List<String> methods = Arrays.asList(allowedMethods.split(","));
        configuration.setAllowedMethods(methods);

        // Headers - tüm header'lara izin ver
        configuration.setAllowedHeaders(Arrays.asList("*"));

        // Exposed headers - frontend'in erişebilmesi için
        configuration.setExposedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"
        ));

        // Credentials
        configuration.setAllowCredentials(allowCredentials);

        // Max age
        configuration.setMaxAge(maxAge);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); // Tüm path'ler için

        return source;
    }
}
