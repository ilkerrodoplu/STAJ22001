package com.survey.ai.controller;

import com.survey.ai.dto.AccountCloseRequest;
import com.survey.ai.dto.AuthResponse;
import com.survey.ai.dto.ChangePasswordRequest;
import com.survey.ai.dto.ProfileUpdateRequest;
import com.survey.ai.dto.UserResponse;
import com.survey.ai.exception.AuthenticationException;
import com.survey.ai.service.AuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Oturumdaki kullanıcının kendi profili ve ayarları.
 * Kimlik her zaman JWT'den gelir; istek gövdesinden kullanıcı seçilemez.
 */
@Slf4j
@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
@Tag(name = "Kullanıcı Profili", description = "Profil bilgileri ve şifre değiştirme")
public class UserController {

    private final AuthService authService;

    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(UserResponse.from(authService.getProfile(currentEmail(authentication))));
    }

    @PutMapping("/profile")
    public ResponseEntity<AuthResponse> updateProfile(Authentication authentication,
                                                      @Valid @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(authService.updateProfile(currentEmail(authentication), request));
    }

    @PutMapping("/profile/password")
    public ResponseEntity<Map<String, String>> changePassword(Authentication authentication,
                                                              @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(currentEmail(authentication), request);
        return ResponseEntity.ok(Map.of("message", "Şifreniz güncellendi"));
    }

    /** Ayarlar > Hesabı kapat. Hesap silinmez, pasife alınır; 1 yıl içinde geri alınabilir. */
    @PostMapping("/close-account")
    public ResponseEntity<Map<String, String>> closeAccount(Authentication authentication,
                                                            @Valid @RequestBody AccountCloseRequest request) {
        authService.closeAccount(currentEmail(authentication), request);
        return ResponseEntity.ok(Map.of("message",
                "Hesabınız kapatıldı. 1 yıl içinde giriş bilgilerinizle geri alabilirsiniz."));
    }

    private String currentEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationException("Oturum bulunamadı, lütfen tekrar giriş yapın");
        }
        return authentication.getName();
    }
}
