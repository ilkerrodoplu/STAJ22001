package com.survey.ai.repository;

import com.survey.ai.entity.PayTRTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PayTRTransactionRepository extends MongoRepository<PayTRTransaction, String> {

    // Temel sorgular
    Optional<PayTRTransaction> findByMerchantOid(String merchantOid);
    List<PayTRTransaction> findByCompanyIdOrderByCreatedAtDesc(String companyId);

    // Status bazlı sorgular
    List<PayTRTransaction> findByStatus(String status);
    List<PayTRTransaction> findByStatusOrderByCreatedAtDesc(String status);
    List<PayTRTransaction> findByCompanyIdAndStatus(String companyId, String status);

    // Pagination ile transaction'lar
    Page<PayTRTransaction> findByCompanyIdOrderByCreatedAtDesc(String companyId, Pageable pageable);
    Page<PayTRTransaction> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    // Başarılı transaction'lar
    List<PayTRTransaction> findByStatusAndCompanyIdOrderByCompletedAtDesc(String status, String companyId);

    // Belirli plan için transaction'lar
    List<PayTRTransaction> findByPlanIdAndStatusOrderByCreatedAtDesc(String planId, String status);

    // Miktar bazlı sorgular
    List<PayTRTransaction> findByAmountBetweenAndStatus(Double minAmount, Double maxAmount, String status);
    List<PayTRTransaction> findByAmountGreaterThanAndStatus(Double amount, String status);

    // Tarih aralığı sorguları
    List<PayTRTransaction> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<PayTRTransaction> findByCompletedAtBetweenAndStatus(LocalDateTime start, LocalDateTime end, String status);

    // Son transaction'lar
    List<PayTRTransaction> findTop10ByStatusOrderByCreatedAtDesc(String status);
    Optional<PayTRTransaction> findTopByCompanyIdAndStatusOrderByCreatedAtDesc(String companyId, String status);

    // İstatistik sorguları
    long countByStatus(String status);
    long countByCompanyIdAndStatus(String companyId, String status);
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    // PayTR token bazlı
    Optional<PayTRTransaction> findByPaytrToken(String paytrToken);
    List<PayTRTransaction> findByPaytrTokenIsNotNull();

    // Hata durumları
    List<PayTRTransaction> findByStatusAndErrorMessageIsNotNullOrderByCreatedAtDesc(String status);
    List<PayTRTransaction> findByErrorMessageContainingIgnoreCase(String keyword);

    // Subscription bazlı
    List<PayTRTransaction> findBySubscriptionIdOrderByCreatedAtDesc(String subscriptionId);
    long countBySubscriptionId(String subscriptionId);

    // Son 30 gün başarılı ödemeler
    @Query("{ 'status': 'SUCCESS', 'completedAt': { $gte: ?0 } }")
    List<PayTRTransaction> findRecentSuccessfulTransactions(LocalDateTime since);

    // Pending transaction'ları temizlemek için (30 dk'dan eski)
    @Query("{ 'status': 'PENDING', 'createdAt': { $lt: ?0 } }")
    List<PayTRTransaction> findExpiredPendingTransactions(LocalDateTime cutoffTime);

    // Revenue data for reports
    @Query(value = "{ 'status': 'SUCCESS', 'completedAt': { $gte: ?0, $lt: ?1 } }",
            fields = "{ 'amount': 1, 'completedAt': 1, 'planId': 1, 'companyId': 1 }")
    List<PayTRTransaction> findRevenueData(LocalDateTime start, LocalDateTime end);

    // Company'nin toplam ödeme miktarı
    @Query(value = "{ 'companyId': ?0, 'status': 'SUCCESS' }", fields = "{ 'amount': 1 }")
    List<PayTRTransaction> findSuccessfulPaymentsByCompanyId(String companyId);
}
