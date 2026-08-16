package com.survey.ai.repository;

import com.survey.ai.entity.SecurityEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SecurityEventRepository extends MongoRepository<SecurityEvent, String> {

    List<SecurityEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<SecurityEvent> findByReadFalseOrderByCreatedAtDesc(Pageable pageable);

    /** "Tümünü okundu işaretle" için; sayfalı sürüm kalanları okunmamış bırakıyordu. */
    List<SecurityEvent> findByReadFalse();

    long countByReadFalse();
}
