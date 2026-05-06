package com.reeva.backend.manager.dto;

import com.reeva.backend.expense.ExpenseCategory;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record PolicyUpdateRequest(

    @NotNull
    ExpenseCategory category,

    @NotNull @Positive
    BigDecimal maxAmount,

    BigDecimal dailyLimit,

    BigDecimal monthlyLimit,

    boolean requiresReceipt,

    Short autoApprovalMinScore,

    String description
) {}
