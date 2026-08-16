package com.survey.ai.repository;


import com.survey.ai.entity.SurveyResponse;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;

@Repository
public interface SurveyResponseRepository extends MongoRepository<SurveyResponse, String> {

     List<SurveyResponse> findBySentimentScore(double score);
    List<SurveyResponse> findBySubmissionDateBetween(LocalDateTime start, LocalDateTime end);

    @Query("{ 'ratings.?0': { $exists: true } }")
    List<SurveyResponse> findRatingsContainingQuestion(String questionId);

    @Query("{ 'ratings.?0': { $exists: true }, 'SubmissionDate': { $gte: ?1, $lte: ?2 } }")
    List<SurveyResponse> findRatingsForQuestionInPeriod(String questionId, LocalDateTime start, LocalDateTime end);

    List<SurveyResponse> findByCompanyId(String companyId);
    List<SurveyResponse> findByCompanyIdAndSurveyTemplateId(String companyId, String surveyTemplateId);
    List<SurveyResponse> findByCompanyIdAndSubmissionDateBetween(
            String companyId, LocalDateTime start, LocalDateTime end);

    // Tarih aralığına göre anket yanıtları
    List<SurveyResponse> findBySurveyTemplateIdAndSubmissionDateBetween(
            String surveyTemplateId, Date startDate, Date endDate);

    // Belirli bir anket şablonuna ait tüm yanıtlar
    List<SurveyResponse> findBySurveyTemplateId(String surveyTemplateId);

    // Company ve tarih aralığına göre
    List<SurveyResponse> findByCompanyIdAndSubmissionDateBetween(
            String companyId, Date startDate, Date endDate);

    // Sentiment'a göre filtreleme
    List<SurveyResponse> findBySurveyTemplateIdAndSentiment(
            String surveyTemplateId, String sentiment);

    // Çeyrek dönemlik aggregate query için custom repository
    @Aggregation(pipeline = {
            "{ '$match': { 'surveyTemplateId': ?0, 'submissionDate': { '$gte': ?1, '$lte': ?2 } } }",
            "{ '$group': { " +
                    "'_id': { " +
                    "'year': { '$year': '$submissionDate' }, " +
                    "'quarter': { '$ceil': { '$divide': [{ '$month': '$submissionDate' }, 3] } } " +
                    "}, " +
                    "'count': { '$sum': 1 }, " +
                    "'avgRating': { '$avg': '$averageRating' }, " +
                    "'responses': { '$push': '$$ROOT' } " +
                    "} }",
            "{ '$sort': { '_id.year': 1, '_id.quarter': 1 } }"
    })
    List<Document> getQuarterlyAggregation(String surveyTemplateId, Date startDate, Date endDate);

    List<SurveyResponse> findAllByCompanyId(String companyId);

    /** Masa QR kodundan gelen yanıtlar; masa bazlı özet için. */
    List<SurveyResponse> findByCompanyIdAndTableNumberNotNull(String companyId);

}