package com.survey.ai.config;


import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.paytr")
@Data
public class PayTRConfigurationProperties {

    private Merchant merchant = new Merchant();
    private Urls urls = new Urls();
    private Settings settings = new Settings();

    @Data
    public static class Merchant {
        private String id;
        private String key;
        private String salt;
    }

    @Data
    public static class Urls {
        private String success;
        private String fail;
        private String callback;
        private String api = "https://www.paytr.com/odeme/api";
        private String iframe = "https://www.paytr.com/odeme/guvenli";
    }

    @Data
    public static class Settings {
        private Boolean testMode = true;
        private String currency = "TL";
        private Integer timeoutLimit = 30;
        private Integer maxInstallment = 0;
        private Boolean debugMode = false;
        private String language = "tr";
    }

    // Convenience methods
    public boolean isValidConfig() {
        return merchant.getId() != null && !merchant.getId().isBlank() &&
                merchant.getKey() != null && !merchant.getKey().isBlank() &&
                merchant.getSalt() != null && !merchant.getSalt().isBlank() &&
                urls.getSuccess() != null && !urls.getSuccess().isBlank() &&
                urls.getFail() != null && !urls.getFail().isBlank() &&
                urls.getCallback() != null && !urls.getCallback().isBlank();
    }
}
