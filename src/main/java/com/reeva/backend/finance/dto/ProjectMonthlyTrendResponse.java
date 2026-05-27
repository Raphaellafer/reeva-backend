package com.reeva.backend.finance.dto;

import java.math.BigDecimal;

public record ProjectMonthlyTrendResponse(
    String month,
    BigDecimal revenue,
    BigDecimal generalExpenses,
    BigDecimal reimbursableExpenses,
    BigDecimal submittedAmount,
    BigDecimal totalCost,
    BigDecimal profit
) {}
