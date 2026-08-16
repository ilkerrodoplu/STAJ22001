
// 4. Updated SentimentResultListener
package com.survey.ai.config;

import com.survey.ai.dto.SurveyResponseKafkaDto;
import com.survey.ai.entity.SurveyResponse;
import com.survey.ai.repository.SurveyResponseRepository;
import com.survey.ai.service.SurveyNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SentimentResultListener {

    private final SurveyResponseRepository surveyResponseRepository;
    private final SurveyNotificationService notificationService;

    @KafkaListener(topics = "sentiment-results", groupId = "survey-response-group")
    public void handleSentimentResult(SurveyResponseKafkaDto message) {
        log.info("Received sentiment result from Kafka: {}", message);

        String surveyResponseId = message.getSurveyResponseId();
        String sentiment = message.getSentiment();
        double score = Double.valueOf(String.valueOf(message.getScore()));

        surveyResponseRepository.findById(surveyResponseId).ifPresent(response -> {
            // Sentiment verilerini güncelle
            response.setSentiment(sentiment);
            response.setSentimentScore(score);
            SurveyResponse savedResponse = surveyResponseRepository.save(response);

            log.info("SurveyResponse [{}] updated with sentiment: {} (score: {})",
                    surveyResponseId, sentiment, score);

            // Bildirim yanıt kaydedilirken oluştu; burada yalnızca duygu sonucuyla
            // güncellenir. Yeni bir kayıt açılmaz, aksi halde şirket aynı anket
            // için iki bildirim görürdü.
            try {
                notificationService.saveResponseNotification(savedResponse);
                log.info("Notification updated for SurveyResponse: {} with sentiment: {}",
                        surveyResponseId, sentiment);
            } catch (Exception e) {
                log.error("Failed to update notification for SurveyResponse: {}", surveyResponseId, e);
            }

            // Duygu ancak burada kesinleşir; olumsuz yanıtın e-postası da buradan gider.
            notificationService.emailOwnerOnNegative(savedResponse);
        });
    }
}