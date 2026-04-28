package com.reeva.backend.ai;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record OcrResult(
    boolean readable,
    String reason,
    String supplierName,
    String supplierCnpj,
    BigDecimal totalAmount,
    LocalDate issueDate,
    String category,
    String description,
    Short score,
    String confidenceReason,
    Boolean policyCompliant,
    String policyReason,
    String sefazVerificationCode,
    String sefazReason,
    String suggestedAction,
    List<LineItem> lineItems,
    String rawJson
) {
    public record LineItem(
        String name,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice
    ) {}
}
