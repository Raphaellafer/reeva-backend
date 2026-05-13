package com.reeva.backend.finance.dto;

import com.reeva.backend.user.User;

import java.time.Instant;
import java.util.UUID;

public record ManagerListResponse(
    UUID id,
    String name,
    String email,
    String cpf,
    String phoneCountryCode,
    String phoneNumber,
    String department,
    long teamSize,
    Instant createdAt
) {
    public static ManagerListResponse of(User user, long teamSize) {
        return new ManagerListResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getCpf(),
            user.getPhoneCountryCode(),
            user.getPhoneNumber(),
            user.getDepartment() != null ? user.getDepartment().getName() : null,
            teamSize,
            user.getCreatedAt()
        );
    }
}
