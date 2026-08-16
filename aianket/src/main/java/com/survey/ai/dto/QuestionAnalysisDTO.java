package com.survey.ai.dto;

import lombok.Data;

import java.util.List;

@Data
public class QuestionAnalysisDTO {
    private String questionText;
    private String period;
    private Double averageRating;
    private Long responseCount;
    private List<RatingDistributionDTO> ratingDistribution;
}