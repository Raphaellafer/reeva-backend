package com.reeva.backend.manager.dto;

import java.math.BigDecimal;

public record DashboardResponse(
    long pendingCount,
    long approvedCount,
    long rejectedCount,
    long needsRevisionCount,
    BigDecimal approvedTotalAmount,
    long teamSize,
    long autoApprovedCount,
    long policyViolationCount,
    long manualReviewCount,
    BigDecimal estimatedSavingsAmount,
    int automationRate
) {}
