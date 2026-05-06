package com.reeva.backend.finance;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class CfoMetricCalculatorTest {

    @Test
    void shouldCalculateProjectPerformanceFormulas() {
        BigDecimal revenue = new BigDecimal("100000.00");
        BigDecimal generalExpenses = new BigDecimal("20000.00");
        BigDecimal reimbursableExpenses = new BigDecimal("5000.00");

        BigDecimal totalCost = CfoMetricCalculator.totalCost(generalExpenses, reimbursableExpenses);
        BigDecimal profit = CfoMetricCalculator.profit(revenue, totalCost);

        assertThat(totalCost).isEqualByComparingTo("25000.00");
        assertThat(profit).isEqualByComparingTo("75000.00");
        assertThat(CfoMetricCalculator.margin(revenue, profit)).isEqualByComparingTo("0.7500");
        assertThat(CfoMetricCalculator.roi(totalCost, profit)).isEqualByComparingTo("3.0000");
    }

    @Test
    void shouldReturnNullForRatiosWhenDenominatorIsZero() {
        assertThat(CfoMetricCalculator.margin(BigDecimal.ZERO, new BigDecimal("100.00"))).isNull();
        assertThat(CfoMetricCalculator.roi(BigDecimal.ZERO, new BigDecimal("100.00"))).isNull();
    }

    @Test
    void shouldTreatNullMoneyAsZero() {
        assertThat(CfoMetricCalculator.totalCost(null, new BigDecimal("12.50"))).isEqualByComparingTo("12.50");
        assertThat(CfoMetricCalculator.profit(null, new BigDecimal("12.50"))).isEqualByComparingTo("-12.50");
    }
}
