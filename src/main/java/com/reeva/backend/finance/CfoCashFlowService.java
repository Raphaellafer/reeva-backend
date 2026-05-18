package com.reeva.backend.finance;

import com.reeva.backend.expense.Expense;
import com.reeva.backend.expense.ExpenseRepository;
import com.reeva.backend.expense.ExpenseStatus;
import com.reeva.backend.finance.dto.BankAccountResponse;
import com.reeva.backend.finance.dto.CashTransactionRequest;
import com.reeva.backend.finance.dto.CfoCashFlowResponse;
import com.reeva.backend.project.Project;
import com.reeva.backend.project.ProjectRepository;
import com.reeva.backend.user.User;
import com.reeva.backend.common.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CfoCashFlowService {

    private static final List<ExpenseStatus> PENDING_PAYMENT_STATUSES = List.of(
        ExpenseStatus.MANAGER_APPROVED,
        ExpenseStatus.FINANCE_APPROVED
    );

    private final BankAccountRepository bankAccountRepository;
    private final CashTransactionRepository cashTransactionRepository;
    private final ExpenseRepository expenseRepository;
    private final ProjectRepository projectRepository;

    public CfoCashFlowService(BankAccountRepository bankAccountRepository,
                              CashTransactionRepository cashTransactionRepository,
                              ExpenseRepository expenseRepository,
                              ProjectRepository projectRepository) {
        this.bankAccountRepository = bankAccountRepository;
        this.cashTransactionRepository = cashTransactionRepository;
        this.expenseRepository = expenseRepository;
        this.projectRepository = projectRepository;
    }

    @Transactional
    public CfoCashFlowResponse.CashTransactionItem createManualTransaction(User currentUser, CashTransactionRequest request) {
        BankAccount account = bankAccountRepository
            .findByIdAndCompanyIdAndActiveTrue(request.bankAccountId(), currentUser.getCompany().getId())
            .orElseThrow(() -> BusinessException.notFound("Conta bancaria nao encontrada"));
        Project project = null;
        if (request.projectId() != null) {
            project = projectRepository.findByIdAndCompanyIdAndActiveTrue(request.projectId(), currentUser.getCompany().getId())
                .orElseThrow(() -> BusinessException.notFound("Projeto nao encontrado"));
        }

        BigDecimal delta = request.type() == CashTransactionType.INFLOW ? request.amount() : request.amount().negate();
        account.apply(delta);
        CashTransaction transaction = new CashTransaction(
            currentUser.getCompany(),
            account,
            project,
            null,
            request.transactionDate(),
            request.description(),
            request.type(),
            request.category(),
            request.amount(),
            account.getCurrentBalance(),
            CashTransactionSource.MANUAL,
            request.externalReference(),
            currentUser
        );
        bankAccountRepository.save(account);
        return CfoCashFlowResponse.CashTransactionItem.from(cashTransactionRepository.save(transaction));
    }

    @Transactional(readOnly = true)
    public CfoCashFlowResponse overview(User currentUser, LocalDate from, LocalDate to) {
        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        LocalDate effectiveFrom = from != null ? from : effectiveTo.withDayOfMonth(1);

        UUID companyId = currentUser.getCompany().getId();
        List<BankAccount> accounts = bankAccountRepository.findByCompanyIdAndActiveTrueOrderByAccountNameAsc(companyId);
        List<CashTransaction> transactions = cashTransactionRepository.findByCompanyAndDateRange(
            companyId, effectiveFrom, effectiveTo);
        List<Expense> pendingPayments = expenseRepository.findByCompanyAndStatusesBetween(
            companyId, PENDING_PAYMENT_STATUSES, effectiveFrom, effectiveTo);

        BigDecimal totalBalance = accounts.stream()
            .map(BankAccount::getCurrentBalance)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal inflow = sumByType(transactions, CashTransactionType.INFLOW);
        BigDecimal outflow = sumByType(transactions, CashTransactionType.OUTFLOW);
        BigDecimal paidReimbursements = transactions.stream()
            .filter(transaction -> transaction.getCategory() == CashTransactionCategory.REIMBURSEMENT)
            .filter(transaction -> transaction.getType() == CashTransactionType.OUTFLOW)
            .map(CashTransaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pendingReimbursementAmount = pendingPayments.stream()
            .map(Expense::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CfoCashFlowResponse(
            effectiveFrom,
            effectiveTo,
            totalBalance,
            inflow,
            outflow,
            inflow.subtract(outflow),
            pendingReimbursementAmount,
            pendingPayments.size(),
            paidReimbursements,
            accounts.stream().map(BankAccountResponse::from).toList(),
            projectCashFlows(transactions),
            transactions.stream().limit(25).map(CfoCashFlowResponse.CashTransactionItem::from).toList()
        );
    }

    private BigDecimal sumByType(List<CashTransaction> transactions, CashTransactionType type) {
        return transactions.stream()
            .filter(transaction -> transaction.getType() == type)
            .map(CashTransaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<CfoCashFlowResponse.ProjectCashFlowItem> projectCashFlows(List<CashTransaction> transactions) {
        Map<UUID, ProjectBucket> buckets = new LinkedHashMap<>();
        for (CashTransaction transaction : transactions) {
            if (transaction.getProject() == null) continue;
            ProjectBucket bucket = buckets.computeIfAbsent(
                transaction.getProject().getId(),
                ignored -> new ProjectBucket(transaction.getProject().getId(), transaction.getProject().getName())
            );
            if (transaction.getType() == CashTransactionType.INFLOW) {
                bucket.inflow = bucket.inflow.add(transaction.getAmount());
            } else {
                bucket.outflow = bucket.outflow.add(transaction.getAmount());
            }
        }
        return buckets.values().stream()
            .map(bucket -> new CfoCashFlowResponse.ProjectCashFlowItem(
                bucket.projectId, bucket.projectName, bucket.inflow, bucket.outflow, bucket.inflow.subtract(bucket.outflow)
            ))
            .toList();
    }

    private static class ProjectBucket {
        private final UUID projectId;
        private final String projectName;
        private BigDecimal inflow = BigDecimal.ZERO;
        private BigDecimal outflow = BigDecimal.ZERO;

        private ProjectBucket(UUID projectId, String projectName) {
            this.projectId = projectId;
            this.projectName = projectName;
        }
    }
}
