package com.reeva.backend.manager.dto;

import com.reeva.backend.expense.ExpenseCategory;
import com.reeva.backend.expense.ExpensePolicy;

import java.math.BigDecimal;
import java.util.UUID;

public record PolicyResponse(
    UUID id,
    ExpenseCategory category,
    BigDecimal maxAmount,
    BigDecimal dailyLimit,
    BigDecimal monthlyLimit,
    boolean requiresReceipt,
    short autoApprovalMinScore,
<<<<<<< HEAD
    String description,
    boolean active
=======
    String description
>>>>>>> origin/main
) {
    public static PolicyResponse from(ExpensePolicy policy) {
        return new PolicyResponse(
            policy.getId(),
            policy.getCategory(),
            policy.getMaxAmount(),
            policy.getDailyLimit(),
            policy.getMonthlyLimit(),
            policy.isRequiresReceipt(),
            policy.getAutoApprovalMinScore(),
<<<<<<< HEAD
            policy.getDescription(),
            policy.isActive()
=======
            policy.getDescription()
>>>>>>> origin/main
        );
    }
}
