package com.survey.ai.dto;


import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReadySurveyTemplateDto {
    private String id;
    private String name;
    private String description;
    private String category;
    private Boolean active;
    private List<ReadyQuestionDto> questions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReadyQuestionDto {
        private String text;
        private Boolean required;
        private String type;
        private Integer displayOrder;

        /** Yalnızca MULTIPLE_CHOICE sorularda dolu. */
        private List<String> options;
    }
}
