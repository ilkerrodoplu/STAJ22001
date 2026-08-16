package com.survey.ai.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PeriodRatingDTO {

    private String period; // Örn: "2023-01" (ocak), "2023-Q1" (1. çeyrek), "2023" (yıl)
    private Double averageRating;
    private Long responseCount;
}