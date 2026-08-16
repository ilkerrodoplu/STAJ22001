package com.survey.ai.util;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class UrlEncoder {

    /**
     * Restoran ID ve Anket ID'yi şifreleyerek bir kod oluşturur
     * @param companyId Restoran ID
     * @param surveyId Anket Şablonu ID
     * @return Şifrelenmiş URL kodu
     */
    public String encodeIds(String companyId, String surveyId) {
        String combined = companyId + ":" + surveyId;
        byte[] bytes = combined.getBytes(StandardCharsets.UTF_8);
        String encoded = Base64.getEncoder().encodeToString(bytes);

        // URL güvenli hale getir
        return encoded.replace('+', '-')
                .replace('/', '_')
                .replace("=", "");
    }

    /**
     * Şifrelenmiş kodu çözerek Restoran ID ve Anket ID'yi elde eder
     * @param encodedString Şifrelenmiş kod
     * @return String dizisi [companyId, surveyId]
     */
    public String[] decodeIds(String encodedString) {
        try {
            // URL güvenli hale getirilmiş karakterleri geri çevir
            String base64String = encodedString.replace('-', '+')
                    .replace('_', '/');

            // Padding ekle gerekirse
            while (base64String.length() % 4 != 0) {
                base64String += "=";
            }

            byte[] decodedBytes = Base64.getDecoder().decode(base64String);
            String decoded = new String(decodedBytes, StandardCharsets.UTF_8);

            return decoded.split(":");
        } catch (Exception e) {
            throw new IllegalArgumentException("Geçersiz kod formatı: " + e.getMessage());
        }
    }
}
