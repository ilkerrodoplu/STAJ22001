package com.survey.ai.repository;

import com.survey.ai.entity.SupportMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportMessageRepository extends MongoRepository<SupportMessage, String> {

    List<SupportMessage> findByCompanyIdOrderByCreatedAtAsc(String companyId);

    /** Şirketin okumadığı (süper adminden gelen) mesajlar. */
    long countByCompanyIdAndFromAdminAndReadFalse(String companyId, boolean fromAdmin);

    /** Süper adminin okumadığı (şirketlerden gelen) mesajlar. */
    long countByFromAdminAndReadFalse(boolean fromAdmin);

    List<SupportMessage> findByFromAdminAndReadFalseOrderByCreatedAtDesc(boolean fromAdmin);
}
