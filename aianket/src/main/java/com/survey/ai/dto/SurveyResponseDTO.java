package com.survey.ai.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public class SurveyResponseDTO {

        @NotBlank(message = "İsim alanı boş olamaz")
        private String name;

        @NotBlank(message = "Email alanı boş olamaz")
        @Email(message = "Geçerli bir email adresi giriniz")
        private String email;

        @NotBlank(message = "Company ID alanı boş olamaz")
        private String companyId;

        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "Ziyaret tarihi YYYY-MM-DD formatında olmalıdır")
        private String visitDate;

        @NotEmpty(message = "Derecelendirmeler boş olamaz")
        private Map<String, Integer> ratings;

        private String comment;

}