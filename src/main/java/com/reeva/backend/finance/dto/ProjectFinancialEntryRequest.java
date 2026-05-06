package com.reeva.backend.finance.dto;

import com.reeva.backend.finance.FinancialEntryCategory;
import com.reeva.backend.finance.FinancialEntrySource;
import com.reeva.backend.finance.FinancialEntryType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProjectFinancialEntryRequest(
    @NotNull FinancialEntryType type,
    @NotNull FinancialEntryCategory category,
    @Size(max = 2000) String description,
    @NotNull @Positive BigDecimal amount,
    @NotNull LocalDate entryDate,
    FinancialEntrySource source
) {}
