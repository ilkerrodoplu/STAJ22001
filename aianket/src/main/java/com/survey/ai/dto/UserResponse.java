package com.survey.ai.dto;


import com.survey.ai.entity.User;
import lombok.Builder;
import lombok.Data;

import java.util.HashSet;
import java.util.Set;

@Data
@Builder
public class UserResponse {
    private String id;
    private String firstName;
    private String lastName;
    private String name;
    private String email;
    private String phone;
    private String address;
    private Set<String> roles = new HashSet<>();
    private String companyId;

    /** PENDING ise panel kapalıdır; ekran yalnızca profil ve ayarları gösterir. */
    private String membershipStatus;

    /** Hesabın açılış anı; sahip onaylamadan önce çalışanın bilgilerini görür. */
    private java.time.LocalDateTime createdAt;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getName())
                .lastName(user.getLastName())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .address(user.getAddress())
                .roles(user.getRoles())
                .companyId(user.getCompanyId())
                .membershipStatus(user.getMembershipStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
