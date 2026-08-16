package com.survey.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Configuration
@ConfigurationProperties(prefix = "paytr")
@Data
@Validated
public class PayTRConfig {

    /**
     * PayTR Merchant ID - PayTR panelinden alınır
     */
    @NotBlank(message = "PayTR Merchant ID boş olamaz")
    private String merchantId;

    /**
     * PayTR Merchant Key - PayTR panelinden alınır
     */
    @NotBlank(message = "PayTR Merchant Key boş olamaz")
    private String merchantKey;

    /**
     * PayTR Merchant Salt - PayTR panelinden alınır
     */
    @NotBlank(message = "PayTR Merchant Salt boş olamaz")
    private String merchantSalt;

    /**
     * Ödeme başarılı olduğunda yönlendirilecek URL
     */
    @NotBlank(message = "Success URL boş olamaz")
    private String successUrl;

    /**
     * Ödeme başarısız olduğunda yönlendirilecek URL
     */
    @NotBlank(message = "Fail URL boş olamaz")
    private String failUrl;

    /**
     * PayTR'den callback alınacak URL
     */
    @NotBlank(message = "Callback URL boş olamaz")
    private String callbackUrl;

    /**
     * Test modu - true: test, false: canlı
     */
    @NotNull(message = "Test mode belirtilmeli")
    private Boolean testMode = true;

    /**
     * PayTR API Base URL
     */
    private String apiUrl = "https://www.paytr.com/odeme/api";

    /**
     * PayTR İframe Base URL
     */
    private String iframeUrl = "https://www.paytr.com/odeme/guvenli";

    /**
     * Default currency (TL, USD, EUR)
     */
    private String defaultCurrency = "TL";

    /**
     * Timeout limit (dakika)
     */
    private Integer timeoutLimit = 30;

    /**
     * Maximum installment count
     */
    private Integer maxInstallment = 0;

    /**
     * Debug mode
     */
    private Boolean debugMode = false;

    /**
     * Language setting
     */
    private String language = "tr";

    // PayTR için gerekli sabitler
    public static final String HASH_ALGORITHM = "MD5";
    public static final String CHARSET = "UTF-8";
    public static final String SUCCESS_STATUS = "success";
    public static final String FAIL_STATUS = "failed";

    // Validation methods
    public boolean isConfigValid() {
        return merchantId != null && !merchantId.trim().isEmpty() &&
                merchantKey != null && !merchantKey.trim().isEmpty() &&
                merchantSalt != null && !merchantSalt.trim().isEmpty() &&
                successUrl != null && !successUrl.trim().isEmpty() &&
                failUrl != null && !failUrl.trim().isEmpty() &&
                callbackUrl != null && !callbackUrl.trim().isEmpty();
    }

    // URL builders
    public String buildSuccessUrl(String merchantOid) {
        return successUrl + "?merchant_oid=" + merchantOid + "&status=success";
    }

    public String buildFailUrl(String merchantOid) {
        return failUrl + "?merchant_oid=" + merchantOid + "&status=failed";
    }

    public String buildCallbackUrl() {
        return callbackUrl;
    }

    public String buildPaymentUrl(String token) {
        return iframeUrl + "/" + token;
    }

    // Log için güvenli görünüm (sensitive bilgileri gizler)
    public String toSafeString() {
        return "PayTRConfig{" +
                "merchantId='" + (merchantId != null ? maskString(merchantId) : "null") + '\'' +
                ", merchantKey='" + (merchantKey != null ? maskString(merchantKey) : "null") + '\'' +
                ", merchantSalt='" + (merchantSalt != null ? maskString(merchantSalt) : "null") + '\'' +
                ", successUrl='" + successUrl + '\'' +
                ", failUrl='" + failUrl + '\'' +
                ", callbackUrl='" + callbackUrl + '\'' +
                ", testMode=" + testMode +
                ", defaultCurrency='" + defaultCurrency + '\'' +
                '}';
    }

    private String maskString(String value) {
        if (value == null || value.length() < 4) {
            return "****";
        }
        return value.substring(0, 2) + "****" + value.substring(value.length() - 2);
    }
}