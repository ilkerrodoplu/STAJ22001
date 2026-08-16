package com.survey.ai.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Şirket kapsamı kontrolü tüm uçlara uygulanır; muafiyetler interceptor içindedir.
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final CompanyScopeInterceptor companyScopeInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(companyScopeInterceptor).addPathPatterns("/**");
    }
}
