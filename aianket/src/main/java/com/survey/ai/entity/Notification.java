package com.survey.ai.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    private String id;

    private String userId;

    private String message;

    private String type; // INFO, WARNING, SUCCESS, ERROR

    private String link;

    private boolean read;

    @CreatedDate
    private LocalDateTime createdAt;

    private LocalDateTime readAt;
}

