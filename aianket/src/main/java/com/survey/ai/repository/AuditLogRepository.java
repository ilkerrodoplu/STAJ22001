package com.survey.ai.repository;

import com.survey.ai.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    List<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
