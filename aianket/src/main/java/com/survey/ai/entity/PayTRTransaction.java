package com.survey.ai.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "paytr_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayTRTransaction {
    @Id
    private String id;

    private String companyId;
    private String subscriptionId;
    private String planId;
    private String merchantOid;
    private String paytrToken;

    private Double amount;
    private String currency = "TL";
    private String status; // PENDING, SUCCESS, FAILED, CANCELLED

    private String paytrResponse;
    private String errorMessage;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime completedAt;
}