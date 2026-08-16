package com.survey.ai.dto;

import com.survey.ai.entity.Company;
import com.survey.ai.entity.User;
import com.survey.ai.enums.CompanyType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Süper adminin şirket yönetimi satırı. Ayrıntı penceresi de bu kayıttan
 * beslendiği için şirketin tüm görünür alanlarını taşır; kayıt kodu (sır)
 * bilinçli olarak yoktur.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AdminCompanyView {

    private String id;
    private String name;
    private String description;
    private String address;
    private String phone;
    private String email;
    private String website;
    private String logoUrl;
    private String status;
    private CompanyType companyType;
    private String companyTypeLabel;
    private String companyTypeOther;
    private String ownerName;
    private String ownerEmail;
    private long userCount;
    private long surveyCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AdminCompanyView of(Company company, User owner, long userCount, long surveyCount) {
        return new AdminCompanyView(
                company.getId(),
                company.getName(),
                company.getDescription(),
                company.getAddress(),
                company.getPhone(),
                company.getEmail(),
                company.getWebsite(),
                company.getLogoUrl(),
                company.getStatus(),
                company.getCompanyType(),
                company.getCompanyType() == null ? null : company.getCompanyType().getLabel(),
                company.getCompanyTypeOther(),
                owner == null ? null : owner.getFullName(),
                owner == null ? null : owner.getEmail(),
                userCount,
                surveyCount,
                company.getCreatedAt(),
                company.getUpdatedAt());
    }
}
