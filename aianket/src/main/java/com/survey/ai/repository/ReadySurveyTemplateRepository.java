package com.survey.ai.repository;

import com.survey.ai.entity.ReadySurveyTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReadySurveyTemplateRepository extends MongoRepository<ReadySurveyTemplate, String> {

    List<ReadySurveyTemplate> findByActiveTrue();

    List<ReadySurveyTemplate> findByCategoryAndActiveTrue(String category);

    List<ReadySurveyTemplate> findByCategoryInAndActiveTrue(Collection<String> categories);

    boolean existsByName(String name);

    Optional<ReadySurveyTemplate> findByNameAndActiveTrue(String name);

    Optional<ReadySurveyTemplate> findByName(String name);

    List<ReadySurveyTemplate> findByCategory(String category);

    long countByCategory(String category);

    long countByActiveTrue();
}
