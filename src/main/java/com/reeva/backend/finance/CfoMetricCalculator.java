package com.reeva.backend.finance;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class CfoMetricCalculator {

    private CfoMetricCalculator() {}

    public static BigDecimal totalCost(BigDecimal generalExpenses, BigDecimal reimbursableExpenses) {
        return money(generalExpenses).add(money(reimbursableExpenses));
    }

    public static BigDecimal profit(BigDecimal revenue, BigDecimal totalCost) {
        return money(revenue).subtract(money(totalCost));
    }

    public static BigDecimal margin(BigDecimal revenue, BigDecimal profit) {
        if (money(revenue).compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        return money(profit).divide(money(revenue), 4, RoundingMode.HALF_UP);
    }

    public static BigDecimal roi(BigDecimal totalCost, BigDecimal profit) {
        if (money(totalCost).compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        return money(profit).divide(money(totalCost), 4, RoundingMode.HALF_UP);
    }

    public static BigDecimal money(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
