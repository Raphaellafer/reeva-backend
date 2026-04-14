package com.reeva.backend.expense.dto;

import com.reeva.backend.expense.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExpenseResponse(
    UUID id,
    UUID userId,
    String userName,
    String title,
    String description,
    ExpenseCategory category,
    BigDecimal amount,
    String currency,
    PaymentMethod paymentMethod,
    LocalDate expenseDate,
    ExpenseStatus status,
    Short aiScore,
    AiAlertLevel aiAlertLevel,
    List<StatusHistoryItem> statusHistory,
    Instant createdAt,
    Instant updatedAt
) {

    public record StatusHistoryItem(
        ExpenseStatus fromStatus,
        ExpenseStatus toStatus,
        String notes,
        Instant changedAt
    ) {}

    public static ExpenseResponse from(Expense e) {
        List<StatusHistoryItem> history = e.getStatusHistory().stream()
            .map(h -> new StatusHistoryItem(
                h.getFromStatus(), h.getToStatus(), h.getNotes(), h.getCreatedAt()))
            .toList();

        return new ExpenseResponse(
            e.getId(),
            e.getUser().getId(),
            e.getUser().getName(),
            e.getTitle(),
            e.getDescription(),
            e.getCategory(),
            e.getAmount(),
            e.getCurrency(),
            e.getPaymentMethod(),
            e.getExpenseDate(),
            e.getStatus(),
            e.getAiScore(),
            e.getAiAlertLevel(),
            history,
            e.getCreatedAt(),
            e.getUpdatedAt()
        );
    }
}
