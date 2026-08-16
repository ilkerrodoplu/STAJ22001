package com.survey.ai.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "subscriptions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {
    @Id
    private String id;

    private String companyId;
    private String planId;
    private String planName;
    private String status; // ACTIVE, EXPIRED, CANCELLED, TRIAL, FREE
    private String billingCycle = "YEARLY"; // Sadece yıllık

    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private LocalDateTime trialStartDate;
    private LocalDateTime trialEndDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private boolean isTrialActive = false;
    private boolean isTrialUsed = false;
    private String paymentMethod = "PAYTR";

    // PayTR bilgileri
    private String lastPaymentId;
    private Double lastPaymentAmount;
    private String merchantOid;

    // Usage tracking
    private Integer surveyCount = 0;
    private Integer responseCount = 0;
}