package com.survey.ai.entity;


import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "ready_survey_templates")
public class ReadySurveyTemplate {

    @Id
    private String id;

    @Indexed
    private String name;

    private String description;

    @Indexed
    private String category; // cafe, restoran, klinik

    @Indexed
    private Boolean active = true;

    private List<ReadyQuestionTemplate> questions;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReadyQuestionTemplate {
        private String text;
        private Boolean required;
        private String type; // RATING, TEXT, MULTIPLE_CHOICE
        private Integer displayOrder;

        /** Yalnızca MULTIPLE_CHOICE sorularda dolu. */
        private List<String> options;

        public ReadyQuestionTemplate(String text, Boolean required, String type, Integer displayOrder) {
            this(text, required, type, displayOrder, null);
        }
    }
}