package com.survey.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegistrationRequest {

    @Valid
    @NotNull(message = "Company bilgisi gereklidir")
    private CompanyDto company;

    @Valid
    @NotNull(message = "User bilgisi gereklidir")
    private UserDto user;
}