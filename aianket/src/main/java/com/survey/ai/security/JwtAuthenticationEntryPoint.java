
package com.survey.ai.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.survey.ai.entity.SecurityEvent;
import com.survey.ai.service.SecurityEventService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT kimlik doğrulama hatalarını yakalamak için AuthenticationEntryPoint implementasyonu.
 * Yetkilendirilmemiş isteklere 401 Unauthorized yanıtı döndürür.
 */
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationEntryPoint.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Lazy: bu bean güvenlik yapılandırmasında kuruluyor, döngüsel bağımlılığı önler. */
    @Autowired
    @Lazy
    private SecurityEventService securityEventService;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException, ServletException {
        String requestURI = request.getRequestURI();
        logger.debug("JwtAuthenticationEntryPoint triggered for: {} {}", request.getMethod(), requestURI);

        // Login veya register endpoint'leri için JwtAuthenticationEntryPoint'i atla
        if (requestURI.contains("/auth/login") || requestURI.contains("/v1/auth/login") ||
                requestURI.contains("/auth/register") || requestURI.contains("/v1/auth/register")) {

            logger.debug("Auth endpoint tespit edildi, filtre zincirini devam ettir: {}", requestURI);
            // Filtre zincirini devam ettir
            request.getRequestDispatcher(requestURI).forward(request, response);
            return;
        }
        // Hata detaylarını logla
        logger.error("Unauthorized error: {}", authException.getMessage());
        logger.error("Request URI: {}", request.getRequestURI());

        // Süper adminin görebilmesi için denetim kaydı (kim/IP/hangi sayfa).
        securityEventService.record(request, SecurityEvent.UNAUTHENTICATED,
                "Oturum yok ya da token geçersiz");

        // Yanıt için hata detayları
        Map<String, Object> errorDetails = new HashMap<>();

        // İstek yolu /auth/login ise farklı davran - kimlik doğrulama isteği
        if (request.getRequestURI().contains("/auth/login")) {
            errorDetails.put("error", "Invalid Credentials");
            errorDetails.put("message", "Geçersiz e-posta veya şifre");
            errorDetails.put("status", 401);
        } else {
            // Standart yetkilendirme hatası
            errorDetails.put("error", "Unauthorized");
            errorDetails.put("message", "Bu kaynağa erişmek için giriş yapmalısınız");
            errorDetails.put("status", 401);
            errorDetails.put("path", request.getRequestURI());
        }

        // JSON yanıtı hazırla
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        // Hata detaylarını JSON formatında yaz
        objectMapper.writeValue(response.getOutputStream(), errorDetails);
    }
}
