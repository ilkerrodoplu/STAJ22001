package com.survey.ai.service;

import com.survey.ai.config.PayTRConfig;
import com.survey.ai.entity.*;
import com.survey.ai.repository.*;
import com.survey.ai.entity.Company;
import com.survey.ai.entity.PayTRTransaction;
import com.survey.ai.entity.PaymentPlan;
import com.survey.ai.entity.Subscription;
import com.survey.ai.repository.CompanyRepository;
import com.survey.ai.repository.PayTRTransactionRepository;
import com.survey.ai.repository.PaymentPlanRepository;
import com.survey.ai.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayTRService {

    private final PayTRConfig paytrConfig;
    private final SubscriptionRepository subscriptionRepository;
    private final PayTRTransactionRepository paytrTransactionRepository;
    private final CompanyRepository companyRepository;
    private final PaymentPlanRepository paymentPlanRepository;

    public Map<String, Object> createPayment(String companyId, String planId) {
        try {
            // Plan ve şirket bilgilerini al
            PaymentPlan plan = paymentPlanRepository.findById(planId)
                    .orElseThrow(() -> new RuntimeException("Plan bulunamadı"));

            Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new RuntimeException("Şirket bulunamadı"));

            // Ücretsiz plan kontrolü
            if (plan.isFree() || plan.getYearlyPrice() == 0) {
                activateFreePlan(companyId, planId);
                return Map.of("success", true, "message", "Ücretsiz plan aktifleştirildi", "isFree", true);
            }

            Double amount = plan.getYearlyPrice();

            // ✅ Alfanumerik merchant_oid (özel karakter yok!)
            String merchantOid = generateValidMerchantOid(companyId);
            // String merchantOid =        "SUB" + companyId.replaceAll("[^a-zA-Z0-9]", "") + System.currentTimeMillis();
            log.info("Using simple test merchant_oid: {}", merchantOid);
            log.info("Generated merchant_oid: {}", merchantOid); // ✅ Debug için

            // Transaction kaydet
            PayTRTransaction transaction = new PayTRTransaction();
            transaction.setCompanyId(companyId);
            transaction.setPlanId(planId);
            transaction.setMerchantOid(merchantOid);
            transaction.setAmount(amount);
            transaction.setStatus("PENDING");
            transaction.setCreatedAt(LocalDateTime.now());
            PayTRTransaction savedTransaction = paytrTransactionRepository.save(transaction);

            // ✅ Direkt API için payment data hazırla
            Map<String, Object> paymentData = preparePaymentData(company, plan, merchantOid, amount);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("transactionId", savedTransaction.getId());
            result.put("paymentData", paymentData);
            result.put("isFree", false);
            result.put("needsCardInfo", true);

            return result;

        } catch (Exception e) {
            log.error("PayTR ödeme oluşturulurken hata: Company: {}, Plan: {}, Error: {}",
                    companyId, planId, e.getMessage(), e);
            return Map.of(
                    "success", false,
                    "error", "Ödeme oluşturulamadı. Lütfen tekrar deneyin.",
                    "errorCode", "PAYMENT_CREATION_FAILED"
            );
        }
    }

    // ✅ Direkt API için payment data hazırla
    private Map<String, Object> preparePaymentData(Company company, PaymentPlan plan,
                                                   String merchantOid, Double amount) {

        String userIp = "127.0.0.1"; // ✅ Production'da gerçek IP kullan
        String email = company.getEmail() != null ? company.getEmail() : "test@example.com";
        String paymentAmount = String.format("%.2f", amount); // ✅ 100.99 formatında
        String userBasket = createUserBasket(plan);

        // ✅ HMAC Token generation (Python örneğine göre)
        String paytrToken = generatePayTRToken(
                paytrConfig.getMerchantId(),
                userIp,
                merchantOid,
                email,
                paymentAmount,
                "card",
                "0", // installment_count
                "TL",
                paytrConfig.getTestMode() ? "1" : "0",
                "0" // non_3d
        );

        Map<String, Object> paymentData = new HashMap<>();
        paymentData.put("merchant_id", paytrConfig.getMerchantId());
        paymentData.put("paytr_token", paytrToken);
        paymentData.put("user_ip", userIp);
        paymentData.put("merchant_oid", merchantOid);
        paymentData.put("email", email);
        paymentData.put("payment_type", "card");
        paymentData.put("payment_amount", paymentAmount);
        paymentData.put("installment_count", "0");
        paymentData.put("currency", "TL");
        paymentData.put("client_lang", "tr");
        paymentData.put("test_mode", paytrConfig.getTestMode() ? "1" : "0");
        paymentData.put("non_3d", "0");
        paymentData.put("non3d_test_failed", "0");
        paymentData.put("merchant_ok_url", paytrConfig.getSuccessUrl());
        paymentData.put("merchant_fail_url", paytrConfig.getFailUrl());
        paymentData.put("user_name", company.getName());
        paymentData.put("user_address", company.getAddress() != null ? company.getAddress() : "Test Adres");
        paymentData.put("user_phone", company.getPhone() != null ? company.getPhone() : "05555555555");
        paymentData.put("user_basket", userBasket);
        paymentData.put("debug_on", paytrConfig.getTestMode() ? "1" : "0");

        return paymentData;
    }

    // ✅ HMAC-SHA256 Token generation (Python örneğine göre)
    private String generatePayTRToken(String merchantId, String userIp, String merchantOid,
                                      String email, String paymentAmount, String paymentType,
                                      String installmentCount, String currency, String testMode,
                                      String non3d) {
        try {
            // ✅ Python örneğindeki sıralama
            String hashStr = merchantId + userIp + merchantOid + email + paymentAmount +
                    paymentType + installmentCount + currency + testMode + non3d;

            log.info("=== PayTR HMAC Token Generation ===");
            log.info("Hash String: {}", hashStr);
            log.info("Merchant Key: {}", paytrConfig.getMerchantKey());
            log.info("Merchant Salt: {}", paytrConfig.getMerchantSalt());

            // ✅ HMAC-SHA256 (Python örneğindeki gibi)
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    paytrConfig.getMerchantKey().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );
            mac.init(secretKeySpec);

            // ✅ Hash string + salt
            String dataToHash = hashStr + paytrConfig.getMerchantSalt();
            byte[] hmacBytes = mac.doFinal(dataToHash.getBytes(StandardCharsets.UTF_8));

            // ✅ Base64 encode
            String token = Base64.getEncoder().encodeToString(hmacBytes);
            log.info("Generated Token: {}", token);
            log.info("=====================================");

            return token;

        } catch (Exception e) {
            log.error("Token generation error: {}", e.getMessage(), e);
            throw new RuntimeException("Token oluşturulamadı", e);
        }
    }

    // ✅ User Basket (Python örneğindeki gibi)
    private String createUserBasket(PaymentPlan plan) {
        try {
            // ✅ JSON array formatı: [["Ürün adı", "fiyat", miktar]]
            String basketJson = String.format("[[\"Anket Sistemi - %s (Yıllık)\", \"%.2f\", 1]]",
                    plan.getName().replaceAll("\"", ""), plan.getYearlyPrice());

            log.info("Basket JSON: {}", basketJson);

            // ✅ HTML unescape gerek yok, direkt Base64
            String encodedBasket = Base64.getEncoder().encodeToString(
                    basketJson.getBytes(StandardCharsets.UTF_8)
            );

            log.info("Basket Base64: {}", encodedBasket);
            return encodedBasket;

        } catch (Exception e) {
            log.error("Basket creation error: {}", e.getMessage());
            return Base64.getEncoder().encodeToString("[[\"Anket Sistemi\", \"100.00\", 1]]".getBytes());
        }
    }

    // ✅ Callback handling - HMAC ile
    public Map<String, Object> handleCallback(Map<String, String> params) {
        try {
            log.info("=== Processing PayTR Callback ===");

            String merchantOid = params.get("merchant_oid");
            String status = params.get("status");
            String totalAmount = params.get("total_amount");
            String hash = params.get("hash");

            log.info("Merchant OID: {}", merchantOid);
            log.info("Status: {}", status);
            log.info("Total Amount: {}", totalAmount);
            log.info("Received Hash: {}", hash);

            // ✅ Transaction bul
            PayTRTransaction transaction = paytrTransactionRepository.findByMerchantOid(merchantOid)
                    .orElseThrow(() -> new RuntimeException("Transaction bulunamadı: " + merchantOid));

            log.info("Found transaction: companyId={}, planId={}, amount={}",
                    transaction.getCompanyId(), transaction.getPlanId(), transaction.getAmount());

            // ✅ Hash doğrulama - HMAC-SHA256 ile
            String hashString = merchantOid + paytrConfig.getMerchantSalt() + status + totalAmount;
            log.info("Hash string for validation: {}", hashString);

            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    paytrConfig.getMerchantKey().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(hashString.getBytes(StandardCharsets.UTF_8));
            String expectedHash = Base64.getEncoder().encodeToString(hmacBytes);

            log.info("Expected Hash: {}", expectedHash);

            if (!expectedHash.equals(hash)) {
                log.error("Hash validation failed! Expected: {}, Received: {}", expectedHash, hash);
                return Map.of("success", false, "error", "Hash doğrulaması başarısız");
            }

            log.info("Hash validation successful!");

            // ✅ Transaction güncelle
            transaction.setStatus("success".equals(status) ? "SUCCESS" : "FAILED");
            transaction.setCompletedAt(LocalDateTime.now());
            transaction.setPaytrResponse(params.toString());
            transaction.setUpdatedAt(LocalDateTime.now());

            // ✅ Başarılı ödeme ise subscription aktifleştir
            if ("success".equals(status)) {
                log.info("Payment successful, activating subscription...");
                activateSubscription(transaction.getCompanyId(), transaction.getPlanId(), totalAmount);
            } else {
                log.warn("Payment failed with status: {}", status);
            }

            paytrTransactionRepository.save(transaction);
            log.info("Transaction updated successfully");

            return Map.of("success", true, "status", status);

        } catch (Exception e) {
            log.error("PayTR callback işlenirken hata:", e);
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    // ✅ Diğer metodlar aynı
    private void activateFreePlan(String companyId, String planId) {
        PaymentPlan plan = paymentPlanRepository.findById(planId).orElse(null);

        Subscription subscription = subscriptionRepository.findByCompanyId(companyId)
                .orElse(new Subscription());

        subscription.setCompanyId(companyId);
        subscription.setPlanId(planId);
        subscription.setPlanName(plan != null ? plan.getName() : "Basic Paket");
        subscription.setStatus("FREE");
        subscription.setStartDate(LocalDateTime.now());
        subscription.setEndDate(LocalDateTime.now().plusYears(10)); // Süresiz
        subscription.setCreatedAt(LocalDateTime.now());
        subscription.setUpdatedAt(LocalDateTime.now());

        subscriptionRepository.save(subscription);
        log.info("Free plan activated for company: {}", companyId);
    }

    public void activateSubscription(String companyId, String planId, String totalAmount) {
        try {
            log.info("=== Activating Subscription ===");
            log.info("Company ID: {}", companyId);
            log.info("Plan ID: {}", planId);
            log.info("Total Amount: {}", totalAmount);

            PaymentPlan plan = paymentPlanRepository.findById(planId).orElse(null);
            if (plan == null) {
                log.error("Plan not found: {}", planId);
                return;
            }

            // ✅ Mevcut subscription'ı bul veya yeni oluştur
            Subscription subscription = subscriptionRepository.findByCompanyId(companyId)
                    .orElse(new Subscription());

            log.info("Existing subscription status: {}", subscription.getStatus());

            // ✅ Subscription güncelle
            subscription.setCompanyId(companyId);
            subscription.setPlanId(planId);
            subscription.setPlanName(plan.getName());
            subscription.setStatus("ACTIVE"); // ✅ FREE değil, ACTIVE!
            subscription.setBillingCycle("YEARLY");
            subscription.setStartDate(LocalDateTime.now());
            subscription.setEndDate(LocalDateTime.now().plusYears(1)); // 1 yıl

            // ✅ Payment bilgileri
            subscription.setLastPaymentAmount(Double.parseDouble(totalAmount) / 100.0); // Kuruştan TL'ye çevir
            subscription.setPaymentMethod("PAYTR");

            // ✅ Trial'ı sonlandır
            subscription.setTrialActive(false);
            subscription.setUpdatedAt(LocalDateTime.now());

            if (subscription.getCreatedAt() == null) {
                subscription.setCreatedAt(LocalDateTime.now());
            }

            Subscription savedSubscription = subscriptionRepository.save(subscription);
            log.info("Subscription activated successfully: status={}, endDate={}",
                    savedSubscription.getStatus(), savedSubscription.getEndDate());

        } catch (Exception e) {
            log.error("Error activating subscription for company: " + companyId, e);
            throw new RuntimeException("Subscription activation failed", e);
        }
    }

    public Map<String, String> startTrial(String companyId) {
        try {
            Subscription existingSubscription = subscriptionRepository.findByCompanyId(companyId).orElse(null);

            // Zaten deneme kullanılmış mı kontrol et
            if (existingSubscription != null && existingSubscription.isTrialUsed()) {
                return Map.of("success", "false", "message", "Deneme sürümü daha önce kullanılmış");
            }

            Subscription subscription = existingSubscription != null ? existingSubscription : new Subscription();
            subscription.setCompanyId(companyId);
            subscription.setPlanId("basic"); // Basic plan ile deneme
            subscription.setPlanName("Basic Paket - Deneme");
            subscription.setStatus("TRIAL");
            subscription.setTrialStartDate(LocalDateTime.now());
            subscription.setTrialEndDate(LocalDateTime.now().plusDays(30));
            subscription.setTrialActive(true);
            subscription.setTrialUsed(true);
            subscription.setStartDate(LocalDateTime.now());
            subscription.setEndDate(LocalDateTime.now().plusDays(30));
            subscription.setUpdatedAt(LocalDateTime.now());

            if (subscription.getCreatedAt() == null) {
                subscription.setCreatedAt(LocalDateTime.now());
            }

            subscriptionRepository.save(subscription);
            return Map.of("success", "true", "message", "Deneme sürümü başlatıldı");

        } catch (Exception e) {
            log.error("Deneme sürümü başlatılırken hata:", e);
            return Map.of("success", "false", "message", "Hata oluştu: " + e.getMessage());
        }
    }

    // Plan limitleri kontrol et
    public boolean checkSurveyLimit(String companyId) {
        Subscription subscription = subscriptionRepository.findByCompanyId(companyId).orElse(null);
        if (subscription == null) return false;

        PaymentPlan plan = paymentPlanRepository.findById(subscription.getPlanId()).orElse(null);
        if (plan == null) return false;

        if (plan.isHasUnlimitedSurveys()) return true;

        return subscription.getSurveyCount() < plan.getSurveyLimit();
    }

    public void incrementSurveyCount(String companyId) {
        Subscription subscription = subscriptionRepository.findByCompanyId(companyId).orElse(null);
        if (subscription != null) {
            subscription.setSurveyCount(subscription.getSurveyCount() + 1);
            subscriptionRepository.save(subscription);
        }
    }

    private String generateValidMerchantOid(String companyId) {
        // ✅ Sadece alfanumerik karakterler
        String cleanCompanyId = companyId.replaceAll("[^a-zA-Z0-9]", "");
        String timestamp = String.valueOf(System.currentTimeMillis());
        String merchantOid = "SUB" + cleanCompanyId + timestamp;

        // ✅ Maksimum uzunluk kontrolü (PayTR limiti)
        if (merchantOid.length() > 64) {
            merchantOid = merchantOid.substring(0, 64);
        }

        log.info("Generated valid merchant_oid: {}", merchantOid);
        return merchantOid;
    }
}