package com.reeva.backend.manager.dto;

import com.reeva.backend.user.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record EmployeeListResponse(
    UUID id,
    String name,
    String email,
    String department,
    long pendingCount,
    long approvedCount,
    BigDecimal totalReimbursed,
    Instant createdAt
) {
    public static EmployeeListResponse of(User user, long pendingCount, long approvedCount, BigDecimal totalReimbursed) {
        return new EmployeeListResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getDepartment() != null ? user.getDepartment().getName() : null,
            pendingCount,
            approvedCount,
            totalReimbursed,
            user.getCreatedAt()
        );
    }
}
