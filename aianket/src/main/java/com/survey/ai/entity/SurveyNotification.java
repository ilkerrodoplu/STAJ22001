// SurveyNotification.java - Field ekleme
package com.survey.ai.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "survey_notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SurveyNotification {

    @Id
    private String id;

    private String companyId;
    private String surveyTemplateId;
    private String surveyResponseId;

    // 🔔 Frontend uyumlu alanlar
    private String title;           // Bildirim başlığı
    private String message;         // Ana mesaj
    private String type;            // survey, comment, system, alert, info, success
    private String sentiment;       // positive, negative, neutral
    private Double sentimentScore;

    private String customerName;
    private String customerEmail;
    private String comment;
    private String actionUrl;       // Tıklayınca gidilecek URL

    private boolean isRead = false;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    // 🏗️ Constructor for creating from survey response
    public SurveyNotification(String companyId, String surveyTemplateId, String surveyResponseId,
                              String title, String message, String type, String sentiment,
                              Double sentimentScore, String customerName, String comment) {
        this.companyId = companyId;
        this.surveyTemplateId = surveyTemplateId;
        this.surveyResponseId = surveyResponseId;
        this.title = title;
        this.message = message;
        this.type = type != null ? type : "comment";
        this.sentiment = sentiment;
        this.sentimentScore = sentimentScore;
        this.customerName = customerName;
        this.comment = comment;
        this.createdAt = LocalDateTime.now();
    }

    public static SurveyNotification createSystemNotification(String companyId, String title, String message) {
        SurveyNotification notification = new SurveyNotification();
        notification.setCompanyId(companyId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType("system");
        notification.setCreatedAt(LocalDateTime.now());
        return notification;
    }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }
}