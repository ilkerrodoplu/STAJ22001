package com.survey.ai.dto;

import com.survey.ai.entity.Company;
import com.survey.ai.enums.CompanyType;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CompanyResponse {
    private String id;
    private String name;
    private String description;
    private String email;
    private String phone;
    private String website;
    private String status;
    private CompanyType companyType;
    private String companyTypeOther;

    public static CompanyResponse from(Company company) {
        return CompanyResponse.builder()
                .id(company.getId())
                .name(company.getName())
                .description(company.getDescription())
                .email(company.getEmail())
                .phone(company.getPhone())
                .website(company.getWebsite())
                .status(company.getStatus())
                .companyType(company.getCompanyType())
                .companyTypeOther(company.getCompanyTypeOther())
                .build();
    }
}