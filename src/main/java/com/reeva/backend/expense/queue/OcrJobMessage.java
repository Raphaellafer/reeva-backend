package com.reeva.backend.expense.queue;

import java.time.Instant;
import java.util.UUID;

public record OcrJobMessage(
    UUID expenseId,
    int attemptNumber,
    Instant enqueuedAt
) {
    public static OcrJobMessage first(UUID expenseId) {
        return new OcrJobMessage(expenseId, 1, Instant.now());
    }

    public OcrJobMessage retry() {
        return new OcrJobMessage(expenseId, attemptNumber + 1, Instant.now());
    }
}
