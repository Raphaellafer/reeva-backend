package com.reeva.backend.manager.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record MarkPaymentRequest(
    @NotNull
    UUID bankAccountId,

    @NotNull
    LocalDate paidDate,

    @Size(max = 255)
    String paymentReference
) {}
