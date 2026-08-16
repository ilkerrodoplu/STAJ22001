package com.survey.ai.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.survey.ai.enums.CompanyType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;



@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompanyDto {

    @NotBlank(message = "Şirket adı gereklidir")
    @Size(min = 2, max = 100, message = "Şirket adı 2-100 karakter arasında olmalıdır")
    private String name;

    @Size(max = 500, message = "Açıklama en fazla 500 karakter olabilir")
    private String description;

    @Size(max = 200, message = "Adres en fazla 200 karakter olabilir")
    private String address;

    @NotBlank(message = "Telefon gereklidir")
    // 444'lü çağrı merkezi hatları 7 hanedir, alt sınır buna göre.
    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Geçersiz telefon formatı")
    @JsonDeserialize(using = PhoneDeserializer.class)
    private String phone;

    @Email(message = "Geçersiz email formatı")
    @NotBlank(message = "Email gereklidir")
    private String email;

    @NotBlank(message = "Website gereklidir")
    @Pattern(regexp = "^(https?://)?(www\\.)?[a-zA-Z0-9-]+(\\.[a-zA-Z]{2,})+(/.*)?$",
            message = "Geçersiz website formatı")
    private String website;

    private String status = "ACTIVE";

    @NotNull(message = "Şirket türü gereklidir")
    private CompanyType companyType;

    @Size(max = 100, message = "Şirket türü en fazla 100 karakter olabilir")
    private String companyTypeOther;

    // "Diğer" seçildiyse serbest metin alanı zorunludur.
    @AssertTrue(message = "Lütfen şirket türünüzü yazınız")
    public boolean isCompanyTypeOtherProvided() {
        return companyType != CompanyType.OTHER
                || (companyTypeOther != null && !companyTypeOther.isBlank());
    }
}