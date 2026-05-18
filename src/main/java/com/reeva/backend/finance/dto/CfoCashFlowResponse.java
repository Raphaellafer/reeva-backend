package com.reeva.backend.finance.dto;

import com.reeva.backend.finance.CashTransaction;
import com.reeva.backend.finance.CashTransactionCategory;
import com.reeva.backend.finance.CashTransactionSource;
import com.reeva.backend.finance.CashTransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CfoCashFlowResponse(
    LocalDate from,
    LocalDate to,
    BigDecimal totalBalance,
    BigDecimal periodInflow,
    BigDecimal periodOutflow,
    BigDecimal netCashFlow,
    BigDecimal pendingReimbursementAmount,
    long pendingReimbursementCount,
    BigDecimal paidReimbursementAmount,
    List<BankAccountResponse> accounts,
    List<ProjectCashFlowItem> projectCashFlows,
    List<CashTransactionItem> recentTransactions
) {
    public record ProjectCashFlowItem(
        UUID projectId,
        String projectName,
        BigDecimal inflow,
        BigDecimal outflow,
        BigDecimal netCashFlow
    ) {}

    public record CashTransactionItem(
        UUID id,
        LocalDate transactionDate,
        String description,
        CashTransactionType type,
        CashTransactionCategory category,
        BigDecimal amount,
        BigDecimal balanceAfter,
        CashTransactionSource source,
        String bankAccountName,
        UUID projectId,
        String projectName,
        UUID expenseId,
        String externalReference
    ) {
        public static CashTransactionItem from(CashTransaction transaction) {
            return new CashTransactionItem(
                transaction.getId(),
                transaction.getTransactionDate(),
                transaction.getDescription(),
                transaction.getType(),
                transaction.getCategory(),
                transaction.getAmount(),
                transaction.getBalanceAfter(),
                transaction.getSource(),
                transaction.getBankAccount().getAccountName(),
                transaction.getProject() != null ? transaction.getProject().getId() : null,
                transaction.getProject() != null ? transaction.getProject().getName() : null,
                transaction.getExpense() != null ? transaction.getExpense().getId() : null,
                transaction.getExternalReference()
            );
        }
    }
}
