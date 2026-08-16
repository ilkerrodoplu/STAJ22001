package com.survey.ai.controller;

import com.survey.ai.dto.InviteCode;
import com.survey.ai.dto.UserResponse;
import com.survey.ai.enums.UserRole;
import com.survey.ai.service.CompanyStaffService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Şirket sahibinin "Çalışanlarım" ekranı: kayıt kodu ve rol atama.
 * Yetki kontrolü servistedir; sahip olmayan kullanıcı hiçbir uca erişemez.
 */
@RestController
@RequestMapping("/v1/company/staff")
@RequiredArgsConstructor
@Tag(name = "Şirket Çalışanları", description = "Çalışan kayıt kodu ve rol yönetimi")
public class CompanyStaffController {

    private final CompanyStaffService companyStaffService;

    @GetMapping("/invite-code")
    public ResponseEntity<Map<String, Object>> inviteCode() {
        return ResponseEntity.ok(body(companyStaffService.getOrCreateInviteCode()));
    }

    @PostMapping("/invite-code/regenerate")
    public ResponseEntity<Map<String, Object>> regenerateInviteCode() {
        return ResponseEntity.ok(body(companyStaffService.regenerateInviteCode()));
    }

    /** Kodun yanında kalan geçerlilik süresi de gider; ekran saniye sayacı gösterir. */
    private Map<String, Object> body(InviteCode inviteCode) {
        return Map.of("inviteCode", inviteCode.getCode(),
                "expiresInSeconds", inviteCode.getExpiresInSeconds());
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> staff() {
        return ResponseEntity.ok(companyStaffService.listStaff());
    }

    /** Atanabilir çalışan rolleri - ekrandaki listenin tek kaynağı. */
    @GetMapping("/roles")
    public ResponseEntity<List<Map<String, String>>> assignableRoles() {
        return ResponseEntity.ok(UserRole.ASSIGNABLE_STAFF_ROLES.stream()
                .sorted((a, b) -> b.getAuthorityLevel() - a.getAuthorityLevel())
                .map(role -> Map.of("value", role.name(), "label", role.getDescription()))
                .toList());
    }

    @PutMapping("/{userId}/role")
    public ResponseEntity<UserResponse> assignRole(@PathVariable String userId, @RequestParam String role) {
        return ResponseEntity.ok(companyStaffService.assignRole(userId, role));
    }

    /** Katılma isteğini onaylar; çalışan bu andan sonra rolünün sayfalarını görür. */
    @PostMapping("/{userId}/approve")
    public ResponseEntity<UserResponse> approveStaff(@PathVariable String userId) {
        return ResponseEntity.ok(companyStaffService.approveStaff(userId));
    }

    /** Katılma isteğini reddeder; hesap silinmez, kullanıcı başka şirkete katılabilir. */
    @PostMapping("/{userId}/reject")
    public ResponseEntity<Void> rejectStaff(@PathVariable String userId) {
        companyStaffService.rejectStaff(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeStaff(@PathVariable String userId) {
        companyStaffService.removeStaff(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Şirketsiz kullanıcının yeni şirkete katılması. Sahip yetkisi istemez;
     * tek koşul kullanıcının hiçbir şirkete bağlı olmamasıdır.
     */
    @PostMapping("/join")
    public ResponseEntity<UserResponse> join(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(companyStaffService.join(request.getOrDefault("inviteCode", "")));
    }
}
