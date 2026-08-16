package com.survey.ai.config;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PayTRValidator {

    private final PayTRConfig paytrConfig;

    @EventListener(ApplicationReadyEvent.class)
    public void validatePayTRConfig() {
        log.info("PayTR konfigürasyonu doğrulanıyor...");

        if (!paytrConfig.isConfigValid()) {
            log.error("❌ PayTR konfigürasyonu geçersiz!");
            log.error("Lütfen application.yml dosyasında PayTR ayarlarını kontrol edin:");
            log.error("- paytr.merchant-id");
            log.error("- paytr.merchant-key");
            log.error("- paytr.merchant-salt");
            log.error("- paytr.success-url");
            log.error("- paytr.fail-url");
            log.error("- paytr.callback-url");

            throw new IllegalStateException("PayTR konfigürasyonu eksik veya hatalı");
        }

        log.info("✅ PayTR konfigürasyonu geçerli");
        log.info("Test Modu: {}", paytrConfig.getTestMode() ? "Açık" : "Kapalı");
        log.info("Merchant ID: {}", maskSensitiveInfo(paytrConfig.getMerchantId()));
        log.info("Success URL: {}", paytrConfig.getSuccessUrl());
        log.info("Fail URL: {}", paytrConfig.getFailUrl());
        log.info("Callback URL: {}", paytrConfig.getCallbackUrl());

        // Java 17 Text Blocks kullanımı
        String configSummary = """
            PayTR Configuration Summary:
            - Test Mode: %s
            - Currency: %s
            - Timeout: %d minutes
            - Debug: %s
            """.formatted(
                paytrConfig.getTestMode(),
                paytrConfig.getDefaultCurrency(),
                paytrConfig.getTimeoutLimit(),
                paytrConfig.getDebugMode()
        );

        log.info(configSummary);
    }

    private String maskSensitiveInfo(String info) {
        if (info == null || info.length() < 4) {
            return "****";
        }
        return info.substring(0, 2) + "****" + info.substring(info.length() - 2);
    }
}
