package com.reeva.backend.ai;

import com.reeva.backend.expense.AiAlertLevel;
import com.reeva.backend.expense.AiDecision;
import com.reeva.backend.expense.ExpenseStatus;
import com.reeva.backend.expense.SefazStatus;

public record AiExpenseDecision(
    AiDecision decision,
    ExpenseStatus status,
    AiAlertLevel alertLevel,
    short score,
    boolean policyCompliant,
    String policyViolationReason,
    SefazStatus sefazStatus,
    String sefazValidationMessage,
    boolean autoApprovalEligible,
    String manualReviewReason,
    String summary
) {}

