package com.survey.ai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.servers.Server;

/**
 * /api context path ile OpenAPI yapılandırması
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Anket Yönetim Sistemi API",
                description = "Restoran anketleri yönetim sistemi için RESTful API",
                version = "1.0.0",
                contact = @Contact(
                        name = "Anket Yönetim Sistemi",
                        email = "info@anketyonetim.com",
                        url = "https://anketyonetim.com"
                ),
                license = @License(
                        name = "Apache 2.0",
                        url = "https://www.apache.org/licenses/LICENSE-2.0"
                )
        ),
        security = {
                @SecurityRequirement(name = "bearerAuth")
        },
        // Önemli: Context path "/api" ile server URL tanımla
        servers = {
                @Server(url = "/api", description = "API Server with Context Path")
        }
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT tabanlı kimlik doğrulama için header'a Bearer token ekleyin"
)
public class OpenAPIConfig {
    // OpenAPI bean'i ekleyebilirsiniz, ancak yukarıdaki anotasyonlar temel ihtiyaçları karşılar
}
