package com.reeva.backend.manager.dto;

import com.reeva.backend.company.Company;
import com.reeva.backend.company.PaymentFrequency;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

public record PaymentScheduleResponse(
    PaymentFrequency frequency,
    Integer weekday,
    Integer dayOfMonth,
    LocalDate nextPaymentDate,
    String summary
) {
    public static PaymentScheduleResponse from(Company company) {
        LocalDate next = nextPaymentDate(company);
        return new PaymentScheduleResponse(
            company.getPaymentFrequency(),
            company.getPaymentWeekday(),
            company.getPaymentDayOfMonth(),
            next,
            summary(company, next)
        );
    }

    private static LocalDate nextPaymentDate(Company company) {
        LocalDate today = LocalDate.now();
        return switch (company.getPaymentFrequency()) {
            case DAILY -> today;
            case WEEKLY -> {
                int weekday = company.getPaymentWeekday() != null ? company.getPaymentWeekday() : 4;
                DayOfWeek target = DayOfWeek.of(weekday);
                yield today.getDayOfWeek() == target ? today : today.with(TemporalAdjusters.next(target));
            }
            case MONTHLY -> {
                int day = company.getPaymentDayOfMonth() != null ? company.getPaymentDayOfMonth() : 20;
                LocalDate candidate = today.withDayOfMonth(Math.min(day, today.lengthOfMonth()));
                if (candidate.isBefore(today)) {
                    LocalDate nextMonth = today.plusMonths(1);
                    candidate = nextMonth.withDayOfMonth(Math.min(day, nextMonth.lengthOfMonth()));
                }
                yield candidate;
            }
            case MANUAL -> null;
        };
    }

    private static String summary(Company company, LocalDate next) {
        return switch (company.getPaymentFrequency()) {
            case DAILY -> "Pagamentos liberados diariamente";
            case WEEKLY -> "Pagamentos semanais";
            case MONTHLY -> "Pagamentos mensais";
            case MANUAL -> "Pagamentos manuais, sem agenda fixa";
        };
    }
}
