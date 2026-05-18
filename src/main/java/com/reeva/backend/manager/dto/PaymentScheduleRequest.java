package com.reeva.backend.manager.dto;

import com.reeva.backend.company.PaymentFrequency;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PaymentScheduleRequest(
    @NotNull
    PaymentFrequency frequency,

    @Min(1)
    @Max(7)
    Integer weekday,

    @Min(1)
    @Max(31)
    Integer dayOfMonth
) {}
