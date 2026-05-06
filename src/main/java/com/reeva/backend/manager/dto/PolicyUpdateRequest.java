package com.reeva.backend.manager.dto;

import com.reeva.backend.expense.ExpenseCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PolicyUpdateRequest(

    @NotNull
    ExpenseCategory category,

    @NotNull
    @DecimalMin("0.01")
    BigDecimal maxAmount,

    @DecimalMin("0.01")
    BigDecimal dailyLimit,

    @DecimalMin("0.01")
    BigDecimal monthlyLimit,

    boolean requiresReceipt,

    @Min(0)
    @Max(100)
    Short autoApprovalMinScore,

    @Size(max = 4000)
    String description
) {}
