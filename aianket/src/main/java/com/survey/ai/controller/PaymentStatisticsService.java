package com.survey.ai.controller;


import com.survey.ai.repository.PaymentPlanRepository;
import com.survey.ai.repository.SubscriptionRepository;
import com.survey.ai.repository.PayTRTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentStatisticsService {

    private final PaymentPlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PayTRTransactionRepository transactionRepository;

    public Map<String, Object> getPaymentStatistics() {
        Map<String, Object> stats = new HashMap<>();

        // Plan istatistikleri
        stats.put("totalPlans", planRepository.countByIsActiveTrue());
        stats.put("freePlans", planRepository.findByIsFreeTrue().size());

        // Abonelik istatistikleri
        stats.put("activeSubscriptions", subscriptionRepository.countByStatus("ACTIVE"));
        stats.put("trialSubscriptions", subscriptionRepository.countByIsTrialActiveTrue());
        stats.put("totalSubscriptions", subscriptionRepository.count());

        // Transaction istatistikleri
        stats.put("successfulTransactions", transactionRepository.countByStatus("SUCCESS"));
        stats.put("pendingTransactions", transactionRepository.countByStatus("PENDING"));
        stats.put("failedTransactions", transactionRepository.countByStatus("FAILED"));

        // Son 30 gün
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        stats.put("recentTransactions",
                transactionRepository.findRecentSuccessfulTransactions(thirtyDaysAgo).size());

        log.info("Payment statistics generated: {}", stats);
        return stats;
    }

    // Süresi dolacak abonelikler (7 gün içinde)
    public Map<String, Object> getExpiringSubscriptions() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sevenDaysLater = now.plusDays(7);

        var expiring = subscriptionRepository.findExpiringSoon(sevenDaysLater, now);

        Map<String, Object> result = new HashMap<>();
        result.put("count", expiring.size());
        result.put("subscriptions", expiring);

        return result;
    }
}
