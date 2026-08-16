package com.survey.ai.repository;


import com.survey.ai.entity.Subscription;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends MongoRepository<Subscription, String> {

    // Temel sorgular
    Optional<Subscription> findByCompanyId(String companyId);
    Optional<Subscription> findByCompanyIdAndStatus(String companyId, String status);

    // Status'a göre sorgular
    List<Subscription> findByStatus(String status);
    List<Subscription> findByStatusOrderByCreatedAtDesc(String status);

    // Aktif abonelikler
    List<Subscription> findByStatusInOrderByEndDateAsc(List<String> statuses);

    // Plan bazlı sorgular
    List<Subscription> findByPlanId(String planId);
    List<Subscription> findByPlanIdAndStatus(String planId, String status);
    long countByPlanIdAndStatus(String planId, String status);

    // Deneme sürümü sorguları
    List<Subscription> findByIsTrialActiveTrue();
    List<Subscription> findByIsTrialUsedTrueAndCompanyId(String companyId);
    long countByIsTrialActiveTrue();

    // Tarih bazlı sorgular
    List<Subscription> findByEndDateBeforeAndStatusIn(LocalDateTime date, List<String> statuses);
    List<Subscription> findByTrialEndDateBeforeAndIsTrialActiveTrue(LocalDateTime date);

    // Pagination ile aktif abonelikler
    Page<Subscription> findByStatus(String status, Pageable pageable);
    Page<Subscription> findByStatusIn(List<String> statuses, Pageable pageable);

    // Ödeme bazlı sorgular
    List<Subscription> findByLastPaymentAmountGreaterThan(Double amount);
    List<Subscription> findByPaymentMethod(String paymentMethod);

    // Kullanım istatistikleri
    @Query("{ 'surveyCount': { $gte: ?0 } }")
    List<Subscription> findBySurveyCountGreaterThanEqual(Integer count);

    @Query("{ 'responseCount': { $gte: ?0 } }")
    List<Subscription> findByResponseCountGreaterThanEqual(Integer count);

    // Süresi dolacak abonelikler
    @Query("{ 'endDate': { $lte: ?0, $gte: ?1 }, 'status': { $in: ['ACTIVE', 'TRIAL'] } }")
    List<Subscription> findExpiringSoon(LocalDateTime endDate, LocalDateTime startDate);

    // İstatistikler için count'lar
    long countByStatus(String status);
    long countByPlanId(String planId);
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    // Son ödeme tarihi bazlı
    List<Subscription> findByLastPaymentAmountNotNullOrderByUpdatedAtDesc();
}