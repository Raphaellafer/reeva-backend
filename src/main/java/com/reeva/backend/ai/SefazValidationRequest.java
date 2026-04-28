package com.reeva.backend.ai;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SefazValidationRequest(
    String supplierCnpj,
    LocalDate issueDate,
    BigDecimal amount,
    String verificationCode
) {}

