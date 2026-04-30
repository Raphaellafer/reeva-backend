package com.reeva.backend.manager.dto;

import com.reeva.backend.expense.Expense;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PaymentBatchResponse(
    LocalDate from,
    LocalDate to,
    BigDecimal totalAmount,
    int employeeCount,
    int expenseCount,
    List<EmployeePayment> employees
) {
    public record EmployeePayment(
        UUID userId,
        String name,
        String email,
        String pixKey,
        BigDecimal totalAmount,
        List<PaymentExpense> expenses
    ) {}

    public record PaymentExpense(
        UUID id,
        String title,
        String projectName,
        LocalDate expenseDate,
        BigDecimal amount,
        boolean autoApproved
    ) {
        public static PaymentExpense from(Expense expense) {
            return new PaymentExpense(
                expense.getId(),
                expense.getTitle(),
                expense.getProject() != null ? expense.getProject().getName() : null,
                expense.getExpenseDate(),
                expense.getAmount(),
                expense.getAiDecision() == com.reeva.backend.expense.AiDecision.AUTO_APPROVED
            );
        }
    }
}
