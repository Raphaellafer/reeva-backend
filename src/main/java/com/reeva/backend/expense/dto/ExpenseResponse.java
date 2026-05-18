package com.reeva.backend.expense.dto;

import com.reeva.backend.expense.*;
import com.reeva.backend.expense.attachment.ExpenseAttachment;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExpenseResponse(
    UUID id,
    UUID userId,
    String userName,
    String title,
    String description,
    String category,
    UUID projectId,
    String projectName,
    BigDecimal amount,
    String currency,
    PaymentMethod paymentMethod,
    LocalDate expenseDate,
    ExpenseStatus status,
    Short aiScore,
    Short complianceScore,
    AiAlertLevel aiAlertLevel,
    String aiAnalysis,
    AiDecision aiDecision,
    String aiDecisionReason,
    Boolean policyCompliant,
    String policyViolationReason,
    SefazStatus sefazStatus,
    String sefazValidationMessage,
    boolean autoApprovalEligible,
    String manualReviewReason,
    String ocrData,
    List<AttachmentItem> attachments,
    List<StatusHistoryItem> statusHistory,
    Instant createdAt,
    Instant updatedAt
) {

    public record StatusHistoryItem(
        ExpenseStatus fromStatus,
        ExpenseStatus toStatus,
        String notes,
        Instant changedAt
    ) {}

    public record AttachmentItem(
        UUID id,
        String fileName,
        String fileUrl,
        String mimeType
    ) {}

    public static ExpenseResponse from(Expense e) {
        List<StatusHistoryItem> history = e.getStatusHistory().stream()
            .map(h -> new StatusHistoryItem(
                h.getFromStatus(), h.getToStatus(), h.getNotes(), h.getCreatedAt()))
            .toList();

        List<AttachmentItem> attachments = e.getAttachments().stream()
            .map(a -> new AttachmentItem(a.getId(), a.getFileName(), a.getFileUrl(), a.getMimeType()))
            .toList();

        return new ExpenseResponse(
            e.getId(),
            e.getUser().getId(),
            e.getUser().getName(),
            e.getTitle(),
            e.getDescription(),
            e.getCategory(),
            e.getProject().getId(),
            e.getProject().getName(),
            e.getAmount(),
            e.getCurrency(),
            e.getPaymentMethod(),
            e.getExpenseDate(),
            e.getStatus(),
            e.getAiScore(),
            e.getComplianceScore(),
            e.getAiAlertLevel(),
            e.getAiAnalysis(),
            e.getAiDecision(),
            e.getAiDecisionReason(),
            e.getPolicyCompliant(),
            e.getPolicyViolationReason(),
            e.getSefazStatus(),
            e.getSefazValidationMessage(),
            e.isAutoApprovalEligible(),
            e.getManualReviewReason(),
            e.getOcrData(),
            attachments,
            history,
            e.getCreatedAt(),
            e.getUpdatedAt()
        );
    }
}
