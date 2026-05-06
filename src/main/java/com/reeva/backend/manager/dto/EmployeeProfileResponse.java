package com.reeva.backend.manager.dto;

import com.reeva.backend.expense.dto.ExpenseResponse;
import com.reeva.backend.user.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record EmployeeProfileResponse(
    UUID id,
    String name,
    String email,
    String department,
    long pendingCount,
    long approvedCount,
    BigDecimal totalReimbursed,
    Instant createdAt,
    List<ExpenseResponse> recentExpenses
) {
    public static EmployeeProfileResponse of(
        User user,
        long pendingCount,
        long approvedCount,
        BigDecimal totalReimbursed,
        List<ExpenseResponse> recentExpenses
    ) {
        return new EmployeeProfileResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getDepartment() != null ? user.getDepartment().getName() : null,
            pendingCount,
            approvedCount,
            totalReimbursed,
            user.getCreatedAt(),
            recentExpenses
        );
    }
}
