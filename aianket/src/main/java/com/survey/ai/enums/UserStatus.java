package com.survey.ai.enums;

import lombok.Getter;

@Getter
public enum UserStatus {
    ACTIVE("ACTIVE"),
    INACTIVE("INACTIVE"),
    SUSPENDED("SUSPENDED"),
    PENDING("PENDING");

    private final String value;

    UserStatus(String value) {
        this.value = value;
    }

    public static UserStatus fromString(String status) {
        if (status == null) return INACTIVE;

        for (UserStatus userStatus : UserStatus.values()) {
            if (userStatus.value.equalsIgnoreCase(status)) {
                return userStatus;
            }
        }
        return INACTIVE; // Default
    }
}