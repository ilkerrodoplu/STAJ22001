package com.survey.ai.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileUpdateRequest {

    @NotBlank(message = "Ad gereklidir")
    @Size(min = 2, max = 50, message = "Ad 2-50 karakter arasında olmalıdır")
    private String name;

    @Size(max = 50, message = "Soyad en fazla 50 karakter olabilir")
    private String lastName;

    @Email(message = "Geçersiz email formatı")
    @NotBlank(message = "Email gereklidir")
    private String email;

    @NotBlank(message = "Telefon gereklidir")
    // 444'lü çağrı merkezi hatları 7 hanedir, alt sınır buna göre.
    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Geçersiz telefon numarası")
    @JsonDeserialize(using = PhoneDeserializer.class)
    private String phone;

    @Size(max = 200, message = "Adres en fazla 200 karakter olabilir")
    private String address;
}
