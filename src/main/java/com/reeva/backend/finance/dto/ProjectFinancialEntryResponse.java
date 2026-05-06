package com.reeva.backend.finance.dto;

import com.reeva.backend.finance.FinancialEntryCategory;
import com.reeva.backend.finance.FinancialEntrySource;
import com.reeva.backend.finance.FinancialEntryType;
import com.reeva.backend.finance.ProjectFinancialEntry;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ProjectFinancialEntryResponse(
    UUID id,
    UUID projectId,
    String projectName,
    FinancialEntryType type,
    FinancialEntryCategory category,
    String description,
    BigDecimal amount,
    String currency,
    LocalDate entryDate,
    FinancialEntrySource source,
    Instant createdAt
) {
    public static ProjectFinancialEntryResponse from(ProjectFinancialEntry entry) {
        return new ProjectFinancialEntryResponse(
            entry.getId(),
            entry.getProject().getId(),
            entry.getProject().getName(),
            entry.getType(),
            entry.getCategory(),
            entry.getDescription(),
            entry.getAmount(),
            entry.getCurrency(),
            entry.getEntryDate(),
            entry.getSource(),
            entry.getCreatedAt()
        );
    }
}
