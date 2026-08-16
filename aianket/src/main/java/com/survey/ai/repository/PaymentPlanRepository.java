package com.survey.ai.repository;


import com.survey.ai.entity.PaymentPlan;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentPlanRepository extends MongoRepository<PaymentPlan, String> {

    // Aktif planları getir
    List<PaymentPlan> findByIsActiveTrue();

    // Aktif planları sıralı getir
    List<PaymentPlan> findByIsActiveTrueOrderByYearlyPriceAsc();

    // Ücretsiz planları getir
    List<PaymentPlan> findByIsFreeTrue();

    // Ücretli planları getir
    List<PaymentPlan> findByIsActiveTrueAndYearlyPriceGreaterThan(Double price);

    // Plan adına göre ara
    Optional<PaymentPlan> findByNameIgnoreCase(String name);

    // Belirli fiyat aralığındaki planlar
    List<PaymentPlan> findByYearlyPriceBetweenAndIsActiveTrue(Double minPrice, Double maxPrice);

    // Sınırsız anket sunan planlar
    @Query("{ 'hasUnlimitedSurveys': true, 'isActive': true }")
    List<PaymentPlan> findUnlimitedSurveyPlans();

    // AI özellikleri olan planlar
    List<PaymentPlan> findByHasAdvancedAITrueAndIsActiveTrue();

    // Belirli survey limiti olan planlar
    List<PaymentPlan> findBySurveyLimitGreaterThanAndIsActiveTrue(Integer minLimit);

    // Plan sayısını getir
    long countByIsActiveTrue();

    // Fiyata göre en düşük plan
    Optional<PaymentPlan> findTopByIsActiveTrueAndYearlyPriceGreaterThanOrderByYearlyPriceAsc(Double minPrice);

    // Fiyata göre en yüksek plan
    Optional<PaymentPlan> findTopByIsActiveTrueOrderByYearlyPriceDesc();
}