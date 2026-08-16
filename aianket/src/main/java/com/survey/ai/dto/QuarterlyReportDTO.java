package com.survey.ai.dto;

import lombok.Data;

@Data
public class QuarterlyReportDTO {
    private String quarter;
    private Double averageRating;
    private Long totalResponses;
    private Long positiveResponses;
    private Long negativeResponses;
    private Long neutralResponses;
}