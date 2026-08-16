package com.survey.ai.dto;

import com.survey.ai.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

/** Süper admin kullanıcı listesi satırı; ayrıntı penceresi de bundan beslenir (şifre hariç). */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class AdminUserView {

    private String id;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private String status;
    private Set<String> roles;
    private String companyId;
    private String companyName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deactivatedAt;

    public static AdminUserView of(User user, String companyName) {
        return new AdminUserView(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getAddress(),
                user.getStatus(),
                user.getRoles(),
                user.getCompanyId(),
                companyName,
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getDeactivatedAt());
    }
}
