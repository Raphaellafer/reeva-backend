package com.reeva.backend.finance.dto;

import com.reeva.backend.finance.BankAccount;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BankAccountResponse(
    UUID id,
    String bankName,
    String accountName,
    String agency,
    String accountNumber,
    UUID projectId,
    String projectName,
    BigDecimal openingBalance,
    BigDecimal currentBalance,
    LocalDate openingBalanceDate
) {
    public static BankAccountResponse from(BankAccount account) {
        return new BankAccountResponse(
            account.getId(),
            account.getBankName(),
            account.getAccountName(),
            account.getAgency(),
            account.getAccountNumber(),
            account.getProject() != null ? account.getProject().getId() : null,
            account.getProject() != null ? account.getProject().getName() : null,
            account.getOpeningBalance(),
            account.getCurrentBalance(),
            account.getOpeningBalanceDate()
        );
    }
}
