package com.survey.ai.dto;


import com.survey.ai.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {

    private String token;
    private String refreshToken;
    private User user;
    private String type;
    private UserResponse userResponse;
    private CompanyResponse company;
    private String message;

    // Kullanıcı bilgilerini güvenli hale getirmek için (şifre vb.)
    public AuthResponse(String token, String refreshToken, User user) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.user = user;
        // Şifre zaten User sınıfında gizleniyor, ek bir işleme gerek yok
    }
}
