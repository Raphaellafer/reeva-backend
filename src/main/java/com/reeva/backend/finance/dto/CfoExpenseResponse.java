package com.reeva.backend.finance.dto;

import com.reeva.backend.expense.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CfoExpenseResponse(
    UUID id,
    String title,
    String supplierName,
    UUID employeeId,
    String employeeName,
    String departmentName,
    UUID managerId,
    String managerName,
    UUID projectId,
    String projectName,
    String projectCode,
    ExpenseCategory category,
    BigDecimal amount,
    String currency,
    LocalDate expenseDate,
    ExpenseStatus status,
    Short aiScore,
    AiAlertLevel aiAlertLevel,
    AiDecision aiDecision,
    Boolean policyCompliant,
    String policyViolationReason,
    SefazStatus sefazStatus,
    boolean duplicate,
    UUID duplicateOfExpenseId,
    String manualReviewReason
) {
    public static CfoExpenseResponse from(Expense expense) {
        var user = expense.getUser();
        var manager = user.getManager();
        var department = user.getDepartment();
        var project = expense.getProject();
        var duplicateOf = expense.getDuplicateOfExpense();
        return new CfoExpenseResponse(
            expense.getId(),
            expense.getTitle(),
            expense.getTitle(),
            user.getId(),
            user.getName(),
            department != null ? department.getName() : null,
            manager != null ? manager.getId() : null,
            manager != null ? manager.getName() : null,
            project.getId(),
            project.getName(),
            project.getCode(),
            expense.getCategory(),
            expense.getAmount(),
            expense.getCurrency(),
            expense.getExpenseDate(),
            expense.getStatus(),
            expense.getAiScore(),
            expense.getAiAlertLevel(),
            expense.getAiDecision(),
            expense.getPolicyCompliant(),
            expense.getPolicyViolationReason(),
            expense.getSefazStatus(),
            duplicateOf != null || expense.getAiDecision() == AiDecision.DUPLICATE_REJECTED,
            duplicateOf != null ? duplicateOf.getId() : null,
            expense.getManualReviewReason()
        );
    }
}
