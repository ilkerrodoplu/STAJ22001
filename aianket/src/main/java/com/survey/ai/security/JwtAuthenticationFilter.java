package com.survey.ai.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
@Autowired
    private  JwtTokenProvider tokenProvider;
@Autowired
    private  CustomUserDetailsService userDetailsService;
    // Kimlik doğrulaması gerektirmeyen endpoint'lerin listesi
    private static final java.util.List<String> PUBLIC_ENDPOINTS = java.util.Arrays.asList(
            "/v1/auth/login",
            "/v1/auth/register",
            "/v1/auth/forgot-password",
            "/v1/auth/reset-password",
            "/public/","/swagger-ui.html","/api/api-docs/swagger-config"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String requestPath = request.getRequestURI();

        // Context path varsa temizle (örneğin /api)
        if (requestPath.startsWith("/api")) {
            requestPath = requestPath.substring(4);
        }

        // OPTIONS istekleri için filtreleme yapma
        if (request.getMethod().equals("OPTIONS")) {
            return true;
        }

        // Public endpoint'ler için kontrol et
        for (String endpoint : PUBLIC_ENDPOINTS) {
            if (requestPath.startsWith(endpoint)) {
                logger.debug("Public endpoint skip filter: {}"+ requestPath);
                return true; // Public endpoint, filtreleme yapma
            }
        }

        return false; // Diğer tüm endpoint'ler için filtreleme yap
    }
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String email = tokenProvider.getEmailFromJWT(jwt);

                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                // Hesap pasife alındıysa ya da süper admin dondurduysa elindeki
                // token da geçersizdir. Kontrol yalnızca girişte olsaydı yaptırım
                // token süresi (24 saat) dolana kadar işlemezdi.
                if (!userDetails.isEnabled()) {
                    filterChain.doFilter(request, response);
                    return;
                }

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
