package com.survey.ai.controller;

import com.survey.ai.entity.PayTRTransaction;
import com.survey.ai.entity.PaymentPlan;
import com.survey.ai.entity.Subscription;
import com.survey.ai.repository.PayTRTransactionRepository;
import com.survey.ai.repository.PaymentPlanRepository;
import com.survey.ai.repository.SubscriptionRepository;
import com.survey.ai.service.PayTRService;
import com.survey.ai.service.SecurityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PayTRService paytrService;
    private final PaymentPlanRepository paymentPlanRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PayTRTransactionRepository transactionRepository;
    private final SecurityService securityService;
    private final PayTRTransactionRepository payTRTransactionRepository;

    @PostMapping("/create-payment")
    public ResponseEntity<Map<String, Object>> createPayment(@RequestBody Map<String, String> request) {
        String companyId = request.get("companyId");
        String planId = request.get("planId");

        try {
            // ✅ Authentication kontrolü
            String bearerToken = securityService.getTokenFromCurrentRequest();

            if (!securityService.isValidToken(bearerToken)) {
                return ResponseEntity.status(401).body(Map.of(
                        "success", false,
                        "error", "Yetkilendirme gerekli",
                        "errorCode", "UNAUTHORIZED"
                ));
            }

            if (!securityService.userOwnsCompany(bearerToken, companyId)) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Bu işlem için yetkiniz yok",
                        "errorCode", "FORBIDDEN"
                ));
            }

            // ✅ Payment oluştur
            Map<String, Object> result = paytrService.createPayment(companyId, planId);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Payment creation failed for company: {}, plan: {}", companyId, planId, e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", "Ödeme oluşturulamadı. Lütfen tekrar deneyin.",
                    "errorCode", "INTERNAL_ERROR"
            ));
        }
    }

    @GetMapping("/status/{merchantOid}")
    public ResponseEntity<Map<String, Object>> getPaymentStatus(@PathVariable String merchantOid) {
        try {
            log.info("Payment status requested for: {}", merchantOid);

            PayTRTransaction transaction = transactionRepository.findByMerchantOid(merchantOid)
                    .orElse(null);

            if (transaction == null) {
                return ResponseEntity.notFound().build();
            }

            Map<String, Object> status = new HashMap<>();
            status.put("merchantOid", merchantOid);
            status.put("status", transaction.getStatus());
            status.put("amount", transaction.getAmount());
            status.put("companyId", transaction.getCompanyId());
            status.put("planId", transaction.getPlanId());
            status.put("createdAt", transaction.getCreatedAt());
            status.put("completedAt", transaction.getCompletedAt());

            // ✅ Abonelik durumu ekleme
            if ("SUCCESS".equals(transaction.getStatus())) {
                Subscription subscription = subscriptionRepository.findByCompanyId(transaction.getCompanyId())
                        .orElse(null);

                if (subscription != null) {
                    status.put("subscriptionStatus", subscription.getStatus());
                    status.put("subscriptionEndDate", subscription.getEndDate());
                    status.put("planName", subscription.getPlanName());
                }
            }

            return ResponseEntity.ok(status);

        } catch (Exception e) {
            log.error("Error fetching payment status for merchantOid: {}", merchantOid, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Ödeme durumu alınamadı: " + e.getMessage()));
        }
    }

    @GetMapping("/plans")
    public ResponseEntity<List<PaymentPlan>> getPaymentPlans() {
        try {
            List<PaymentPlan> plans = paymentPlanRepository.findByIsActiveTrue();
            log.info("Found {} active payment plans", plans.size());
            return ResponseEntity.ok(plans);
        } catch (Exception e) {
            log.error("Error fetching payment plans", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/subscription/{companyId}")
    public ResponseEntity<Subscription> getSubscription(@PathVariable String companyId) {
        try {
            return subscriptionRepository.findByCompanyId(companyId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error fetching subscription for company: {}", companyId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ✅ PayTR Callback endpoint
    @PostMapping("/paytr/callback")
    public ResponseEntity<String> paytrCallback(@RequestParam Map<String, String> params) {
        try {
            log.info("=== PayTR Callback Received ===");
            log.info("All params: {}", params);
            log.info("=====================================");

            // ✅ Param kontrolü
            String merchantOid = params.get("merchant_oid");
            String status = params.get("status");
            String totalAmount = params.get("total_amount");
            String hash = params.get("hash");

            if (merchantOid == null || status == null || totalAmount == null || hash == null) {
                log.error("Missing required parameters in callback");
                return ResponseEntity.badRequest().body("FAIL - Missing parameters");
            }

            Map<String, Object> result = paytrService.handleCallback(params);

            if ((Boolean) result.get("success")) {
                log.info("PayTR callback processed successfully");
                return ResponseEntity.ok("OK");
            } else {
                log.error("PayTR callback processing failed: {}", result.get("error"));
                return ResponseEntity.badRequest().body("FAIL");
            }

        } catch (Exception e) {
            log.error("Error processing PayTR callback", e);
            return ResponseEntity.internalServerError().body("ERROR");
        }
    }

    @PostMapping("/start-trial")
    public ResponseEntity<Map<String, Object>> startTrial(@RequestBody Map<String, String> request) {
        try {
            String bearerToken = securityService.getTokenFromCurrentRequest();
            String companyId = request.get("companyId");

            // ✅ Validation
            if (!securityService.isValidToken(bearerToken)) {
                return ResponseEntity.status(401).body(Map.of(
                        "success", false,
                        "error", "Yetkilendirme gerekli"
                ));
            }

            if (!securityService.userOwnsCompany(bearerToken, companyId)) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "error", "Bu işlem için yetkiniz yok"
                ));
            }

            // ✅ Trial başlat
            Map<String, String> result = paytrService.startTrial(companyId);

            // ✅ Response formatını düzelt
            Map<String, Object> response = new HashMap<>();
            response.put("success", "true".equals(result.get("success")));
            response.put("message", result.get("message"));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Trial start failed for company: {}", request.get("companyId"), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", "Deneme sürümü başlatılamadı: " + e.getMessage()
            ));
        }
    }

    // ✅ Plan limiti kontrol endpoint
    @GetMapping("/check-limits/{companyId}")
    public ResponseEntity<Map<String, Object>> checkLimits(@PathVariable String companyId) {
        try {
            boolean canCreateSurvey = paytrService.checkSurveyLimit(companyId);

            Subscription subscription = subscriptionRepository.findByCompanyId(companyId).orElse(null);
            PaymentPlan plan = null;

            if (subscription != null) {
                plan = paymentPlanRepository.findById(subscription.getPlanId()).orElse(null);
            }

            Map<String, Object> limits = Map.of(
                    "canCreateSurvey", canCreateSurvey,
                    "currentSurveyCount", subscription != null ? subscription.getSurveyCount() : 0,
                    "surveyLimit", plan != null ? plan.getSurveyLimit() : 0,
                    "hasUnlimitedSurveys", plan != null && plan.isHasUnlimitedSurveys()
            );

            return ResponseEntity.ok(limits);

        } catch (Exception e) {
            log.error("Error checking limits for company: {}", companyId, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Limit kontrolü yapılamadı"));
        }
    }

    // ✅ Health check endpoint
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "healthy",
                "timestamp", System.currentTimeMillis(),
                "service", "payment-service"
        ));
    }

    @PostMapping("/fix-subscription/{companyId}")
    public ResponseEntity<?> fixSubscription(@PathVariable String companyId, @RequestBody Map<String, String> request) {
        try {
            String planId = request.get("planId");
            log.info("Manually fixing subscription for company: {}, plan: {}", companyId, planId);

            // En son başarılı transaction'ı bul
            PayTRTransaction transaction = payTRTransactionRepository
                    .findByCompanyIdAndStatus(companyId, "SUCCESS")
                    .stream()
                    .findFirst()
                    .orElse(null);

            if (transaction != null) {
                paytrService.activateSubscription(companyId, planId, "10000"); // 100 TL example
                return ResponseEntity.ok(Map.of("success", true, "message", "Subscription fixed"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "No successful transaction found"));
            }

        } catch (Exception e) {
            log.error("Error fixing subscription", e);
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}