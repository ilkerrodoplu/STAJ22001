package com.survey.ai.controller;

import com.survey.ai.dto.AuthResponse;
import com.survey.ai.dto.EmployeeRegistrationRequest;
import com.survey.ai.dto.LoginRequest;
import com.survey.ai.dto.PasswordResetRequest;
import com.survey.ai.dto.RegistrationRequest;
import com.survey.ai.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegistrationRequest registrationRequest) {

        log.info("Registration request received for email: {}",
                registrationRequest.getUser().getEmail());

        try {
            AuthResponse response = authService.register(registrationRequest);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            log.error("Registration failed: {}", e.getMessage());
            throw e;
        }
    }

    /** Çalışan kaydı - şirket bilgisi değil, sahibinden alınan kayıt kodu istenir. */
    @PostMapping("/register/employee")
    public ResponseEntity<AuthResponse> registerEmployee(
            @Valid @RequestBody EmployeeRegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerEmployee(request));
    }

    /** Kapatılmış hesabı geri alma - kullanıcı devre dışı olduğu için normal login çalışmaz. */
    @PostMapping("/reactivate")
    public ResponseEntity<AuthResponse> reactivate(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.reactivateAccount(loginRequest));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@RequestParam String email) {
        authService.sendPasswordResetEmail(email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody PasswordResetRequest passwordResetRequest) {
        authService.resetPassword(
                passwordResetRequest.getToken(),
                passwordResetRequest.getNewPassword()
        );
        return ResponseEntity.ok().build();
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponse> refreshToken(@RequestParam String refreshToken) {
        return ResponseEntity.ok(authService.refreshToken(refreshToken));
    }

    /*
     * /validate-token KALDIRILDI. Anonim erişime açıktı ve verilen herhangi bir
     * token için geçerli/geçersiz cevabı veriyordu: saldırgan ele geçirdiği ya da
     * ürettiği token'ları hiçbir iz bırakmadan, sınırsızca deneyebiliyordu.
     * Hiçbir istemci çağırmıyordu; JWT'nin süresi zaten istemci tarafında
     * çözülerek okunabilir.
     */
}
