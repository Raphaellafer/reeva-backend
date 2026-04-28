package com.reeva.backend.ai;

import com.reeva.backend.expense.SefazStatus;

public record SefazValidationResult(
    SefazStatus status,
    String message
) {}

