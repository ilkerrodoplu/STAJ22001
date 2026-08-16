package com.survey.ai.service;

import com.survey.ai.config.PayTRConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayTRUtilityService {

    private final PayTRConfig paytrConfig;

    /**
     * PayTR token oluşturur (Java 17 özellikleri ile)
     */
    public String generatePayTRToken(String merchantOid, Double amount, String email, String userIp) {
        // Java 17 Text Blocks kullanımı
        String hashString = """
            %s%s%s%s%s%s%s%s%s
            """.formatted(
                paytrConfig.getMerchantId(),
                userIp,
                merchantOid,
                email,
                String.valueOf(amount.intValue() * 100),
                paytrConfig.getDefaultCurrency(),
                paytrConfig.getTestMode() ? "1" : "0",
                "1", // no_installment
                paytrConfig.getMerchantSalt()
        ).trim();

        return generateMD5Hash(hashString);
    }

    /**
     * Callback hash doğrulaması (Java 17 özellikleri ile)
     */
    public boolean validateCallbackHash(String merchantOid, String status, String totalAmount, String receivedHash) {
        String expectedHashString = """
            %s%s%s%s
            """.formatted(
                merchantOid,
                paytrConfig.getMerchantSalt(),
                status,
                totalAmount
        ).trim();

        String expectedHash = generateMD5Hash(expectedHashString);

        boolean isValid = expectedHash.equals(receivedHash);

        if (!isValid) {
            log.warn("PayTR callback hash validation failed. Expected: {}, Received: {}",
                    expectedHash, receivedHash);
        }

        return isValid;
    }

    /**
     * MD5 hash oluşturur (Java 17 HexFormat ile)
     */
    private String generateMD5Hash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hashBytes = md.digest(input.getBytes(StandardCharsets.UTF_8));

            // Java 17 HexFormat kullanımı
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            log.error("MD5 algorithm not available", e);
            throw new RuntimeException("MD5 hash generation failed", e);
        }
    }

    /**
     * PayTR user basket JSON oluşturur
     */
    public String createUserBasket(String planName, Double price) {
        // Java 17 Text Blocks ile JSON oluşturma
        return """
            [[\"%s\",\"%.2f\",1]]
            """.formatted(planName, price);
    }

    /**
     * Configuration özeti döner
     */
    public String getConfigSummary() {
        return """
            PayTR Configuration:
            - Merchant ID: %s
            - Test Mode: %s
            - Currency: %s
            - Timeout: %d minutes
            - Debug: %s
            """.formatted(
                maskSensitiveData(paytrConfig.getMerchantId()),
                paytrConfig.getTestMode(),
                paytrConfig.getDefaultCurrency(),
                paytrConfig.getTimeoutLimit(),
                paytrConfig.getDebugMode()
        );
    }

    private String maskSensitiveData(String data) {
        if (data == null || data.length() < 4) {
            return "****";
        }
        return data.substring(0, 2) + "****" + data.substring(data.length() - 2);
    }
}
