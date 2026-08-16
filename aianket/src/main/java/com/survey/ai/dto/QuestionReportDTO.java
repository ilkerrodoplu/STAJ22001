package com.survey.ai.dto;



import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionReportDTO {

    private String questionId;
    private String questionText;
    private String category;

    private List<PeriodRatingDTO> periodRatings;
}