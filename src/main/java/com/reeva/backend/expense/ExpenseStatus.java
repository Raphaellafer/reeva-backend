package com.reeva.backend.expense;

public enum ExpenseStatus {
    DRAFT,
    SUBMITTED,
    AI_APPROVED,
    PENDING_REVIEW,
    MANAGER_APPROVED,
    MANAGER_REJECTED,
    FINANCE_APPROVED,
    FINANCE_REJECTED,
    PAID,
    CANCELLED,
    NEEDS_REVISION
}
