package com.reeva.backend.finance.dto;

import com.reeva.backend.finance.CashTransactionCategory;
import com.reeva.backend.finance.CashTransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CashTransactionRequest(
    @NotNull
    UUID bankAccountId,

    UUID projectId,

    @NotNull
    LocalDate transactionDate,

    @NotBlank
    @Size(max = 500)
    String description,

    @NotNull
    CashTransactionType type,

    @NotNull
    CashTransactionCategory category,

    @NotNull
    @DecimalMin("0.01")
    BigDecimal amount,

    @Size(max = 255)
    String externalReference
) {}
