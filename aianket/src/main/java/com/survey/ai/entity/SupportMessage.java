package com.survey.ai.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Şirket kullanıcıları ile süper admin arasındaki yazışma.
 * Her şirket için tek bir konuşma vardır; companyId konuşmanın anahtarıdır.
 */
@Document(collection = "support_messages")
@Data
@NoArgsConstructor
public class SupportMessage {

    @Id
    private String id;

    @Indexed
    private String companyId;

    private String companyName;

    /** true: süper adminden şirkete, false: şirketten süper admine. */
    private boolean fromAdmin;

    private String senderUserId;
    private String senderName;
    private String senderEmail;

    /**
     * Mesajın ilgili olduğu anket. Askıdan çıkarma talebinde şirket anketi
     * seçer; süper admin hangi anket için konuşulduğunu tahmin etmek zorunda
     * kalmaz. Genel mesajlarda null.
     */
    private String surveyTemplateId;
    private String surveyName;

    private String body;

    /** Karşı taraf okudu mu; okunmamışlar bildirim rozetinde sayılır. */
    private boolean read;

    private LocalDateTime createdAt = LocalDateTime.now();
}
