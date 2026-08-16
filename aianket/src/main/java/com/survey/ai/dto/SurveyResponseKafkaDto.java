package com.survey.ai.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Data
@Getter@Setter
public class SurveyResponseKafkaDto {

    private String surveyResponseId;  // Survey Response ID
    private String comment;           // Yorum
    private String language;          // Dil
    private String sentiment;         // Duygu (sentiment)
    private BigDecimal score;            // Puan (score)


    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSSSSZ")  // Date format: "2025-06-28T21:06:15.384253Z"
    private String createdAt;         // Oluşturulma zamanı



}
