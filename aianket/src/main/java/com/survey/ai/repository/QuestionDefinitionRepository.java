package com.survey.ai.repository;


import com.survey.ai.entity.QuestionDefinition;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionDefinitionRepository extends MongoRepository<QuestionDefinition, String> {
    List<QuestionDefinition> findByActiveOrderByDisplayOrderAsc(boolean active);

    List<QuestionDefinition> findByCategory(String category);

    List<QuestionDefinition> findByActive(boolean active);
}