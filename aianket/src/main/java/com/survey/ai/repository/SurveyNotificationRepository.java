// SurveyNotificationRepository.java
package com.survey.ai.repository;

import com.survey.ai.entity.SurveyNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SurveyNotificationRepository extends MongoRepository<SurveyNotification, String> {

    /** Bir yanıtın bildirimi tektir; duygu analizi sonucu geldiğinde bu kayıt güncellenir. */
    Optional<SurveyNotification> findBySurveyResponseId(String surveyResponseId);

    // 📋 Basic queries - List dönenler
    List<SurveyNotification> findByCompanyIdOrderByCreatedAtDesc(String companyId);

    // 📋 Basic queries - Page dönenler (Pageable gerekli!)
    Page<SurveyNotification> findByCompanyId(String companyId, Pageable pageable);

    // 📬 Unread queries - List dönenler
    List<SurveyNotification> findByCompanyIdAndIsReadFalseOrderByCreatedAtDesc(String companyId);

    // 📬 Unread queries - Page dönenler (Pageable gerekli!)
    Page<SurveyNotification> findByCompanyIdAndIsReadFalse(String companyId, Pageable pageable);

    // 📊 Count query (Pageable gerektirmez)
    long countByCompanyIdAndIsReadFalse(String companyId);

    // 📭 Read queries - Page dönenler (Pageable gerekli!)
    Page<SurveyNotification> findByCompanyIdAndIsReadTrue(String companyId, Pageable pageable);

    // 🏷️ Sentiment queries - List dönenler
    List<SurveyNotification> findByCompanyIdAndSentimentOrderByCreatedAtDesc(String companyId, String sentiment);

    // 🏷️ Sentiment queries - Page dönenler (Pageable gerekli!)
    Page<SurveyNotification> findByCompanyIdAndSentiment(String companyId, String sentiment, Pageable pageable);

    // 🗓️ Date range queries (opsiyonel) - Page dönenler (Pageable gerekli!)
    // Page<SurveyNotification> findByCompanyIdAndCreatedAtBetween(String companyId, LocalDateTime start, LocalDateTime end, Pageable pageable);

    // ✅ Ek yararlı query'ler
    List<SurveyNotification> findByCompanyIdAndIsReadTrueOrderByCreatedAtDesc(String companyId);

    // 🔢 Count queries (Pageable gerektirmez)
    long countByCompanyId(String companyId);
    long countByCompanyIdAndIsReadTrue(String companyId);
    long countByCompanyIdAndSentiment(String companyId, String sentiment);
}