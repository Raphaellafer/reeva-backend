package com.reeva.backend.finance.dto;

import com.reeva.backend.expense.ExpenseCategory;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CfoComplianceResponse(
    long processedExpenseCount,
    long policyViolationCount,
    long duplicateRejectedCount,
    long lowOcrConfidenceCount,
    BigDecimal totalAvoidedAmount,
    int complianceRate,
    List<RiskyEmployeeItem> riskyEmployees,
    List<RiskyProjectItem> riskyProjects,
    List<RiskyCategoryItem> riskyCategories
) {
    public record RiskyEmployeeItem(
        UUID employeeId,
        String employeeName,
        String departmentName,
        String managerName,
        long expenseCount,
        BigDecimal totalAmount,
        long policyViolationCount,
        long duplicateRejectedCount,
        long lowOcrConfidenceCount,
        BigDecimal avoidedAmount,
        int riskScore,
        String riskLevel
    ) {}

    public record RiskyProjectItem(
        UUID projectId,
        String projectName,
        String projectCode,
        long expenseCount,
        BigDecimal totalAmount,
        long policyViolationCount,
        long duplicateRejectedCount,
        BigDecimal avoidedAmount,
        int riskScore,
        String riskLevel
    ) {}

    public record RiskyCategoryItem(
        ExpenseCategory category,
        long expenseCount,
        BigDecimal totalAmount,
        long policyViolationCount,
        BigDecimal avoidedAmount,
        int riskScore,
        String riskLevel
    ) {}
}
