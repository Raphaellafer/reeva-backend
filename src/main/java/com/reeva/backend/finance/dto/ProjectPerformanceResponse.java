package com.reeva.backend.finance.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProjectPerformanceResponse(
    UUID projectId,
    String projectName,
    String projectCode,
    BigDecimal revenue,
    BigDecimal generalExpenses,
    BigDecimal reimbursableExpenses,
    BigDecimal totalSubmittedAmount,
    BigDecimal totalCost,
    BigDecimal profit,
    BigDecimal margin,
    BigDecimal roi,
    BigDecimal avoidableLosses,
    BigDecimal aiSavings,
    long reimbursedExpenseCount,
    long totalExpenseCount,
    long autoApprovedCount,
    int complianceRate,
    int autoApprovalRate,
    List<ProjectMonthlyTrendResponse> monthlyTrend
) {}
