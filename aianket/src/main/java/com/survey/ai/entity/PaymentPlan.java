package com.survey.ai.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "payment_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentPlan {
    @Id
    private String id;

    private String name;
    private String description;
    private Double yearlyPrice;
    private Double monthlyPrice; // İleride aylık plan eklenirse
    private Integer surveyLimit;
    private Integer questionLimit;
    private Integer responseLimit;
    private boolean isActive = true;
    private LocalDateTime createdAt;

    // Plan özellikleri
    private boolean hasTrialAccess = true;
    private boolean hasReports = true;
    private boolean hasCsvExport = true;
    private boolean hasAdvancedAI = false;
    private boolean hasRealTimeAnalysis = false;
    private boolean hasUnlimitedSurveys = false;
    private boolean hasWeeklyAIStrategies = false;
    private boolean hasIntegrations = false;

    // Frontend için ek bilgiler
    private List<String> features;
    private String displayPrice;
    private boolean isFree = false;

    // Convenience constructor
    public PaymentPlan(String id, String name, String description, String displayPrice,
                       Double yearlyPrice, Double monthlyPrice, Integer surveyLimit, Integer questionLimit,
                       Integer responseLimit, List<String> features) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.displayPrice = displayPrice;
        this.yearlyPrice = yearlyPrice;
        this.surveyLimit = surveyLimit;
        this.questionLimit = questionLimit;
        this.responseLimit = responseLimit;
        this.features = features;
        this.createdAt = LocalDateTime.now();
        this.monthlyPrice=monthlyPrice;
        this.isActive = true;
    }
}