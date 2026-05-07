package com.reeva.backend.finance.dto;

import com.reeva.backend.expense.ExpenseCategory;
import com.reeva.backend.expense.ExpenseStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CfoOverviewResponse(
    BigDecimal totalReimbursedAmount,
    BigDecimal totalSubmittedAmount,
    BigDecimal avoidableLosses,
    BigDecimal aiSavings,
    int complianceRate,
    int autoApprovalRate,
    long processedExpenseCount,
    long duplicateRejectedCount,
    long policyViolationCount,
    long lowOcrConfidenceCount,
    List<ProjectRiskItem> projectRiskRanking,
    List<CategorySpendItem> categorySpend,
    List<StatusDistributionItem> statusDistribution,
    List<MonthlyReimbursementTrendItem> monthlyReimbursementTrend,
    List<CfoRecommendationResponse> recommendations
) {
    public record ProjectRiskItem(
        UUID projectId,
        String projectName,
        String projectCode,
        BigDecimal reimbursedAmount,
        BigDecimal avoidableLosses,
        int complianceRate,
        int riskScore
    ) {}

    public record CategorySpendItem(
        ExpenseCategory category,
        BigDecimal amount,
        long expenseCount,
        BigDecimal avoidableLosses
    ) {}

    public record StatusDistributionItem(
        ExpenseStatus status,
        long count,
        BigDecimal amount
    ) {}

    public record MonthlyReimbursementTrendItem(
        String month,
        BigDecimal reimbursedAmount,
        BigDecimal submittedAmount,
        BigDecimal avoidableLosses
    ) {}
}
