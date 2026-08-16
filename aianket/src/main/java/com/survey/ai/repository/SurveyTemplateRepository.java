package com.survey.ai.repository;

import com.survey.ai.entity.SurveyTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SurveyTemplateRepository extends MongoRepository<SurveyTemplate, String> {
    List<SurveyTemplate> findByCompanyId(String companyId);
    List<SurveyTemplate> findByCompanyIdAndActive(String companyId, Boolean active);

   List<SurveyTemplate> findByActive( Boolean active);

    /** Uyarısı verilen ve süresi dolan anketler (site admini uyarı takibi). */
    List<SurveyTemplate> findByWarnedAtBefore(java.time.LocalDateTime before);

    boolean existsByName(String müşteriMemnuniyetAnketi);
    boolean existsByCompanyIdAndActive(String companyId, Boolean active);
    SurveyTemplate findByCompanyIdAndId(String companyId, String surveyTemplateId);
    SurveyTemplate findSurveyTemplateByName(String müşteriMemnuniyetAnketi);
}

