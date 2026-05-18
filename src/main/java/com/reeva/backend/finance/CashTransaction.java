package com.reeva.backend.finance;

import com.reeva.backend.company.Company;
import com.reeva.backend.expense.Expense;
import com.reeva.backend.project.Project;
import com.reeva.backend.user.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "cash_transactions")
public class CashTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bank_account_id", nullable = false)
    private BankAccount bankAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id")
    private Expense expense;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CashTransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CashTransactionCategory category;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "balance_after", nullable = false, precision = 14, scale = 2)
    private BigDecimal balanceAfter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CashTransactionSource source;

    @Column(name = "external_reference", length = 255)
    private String externalReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected CashTransaction() {}

    public CashTransaction(Company company, BankAccount bankAccount, Project project, Expense expense,
                           LocalDate transactionDate, String description, CashTransactionType type,
                           CashTransactionCategory category, BigDecimal amount, BigDecimal balanceAfter,
                           CashTransactionSource source, String externalReference, User createdBy) {
        this.company = company;
        this.bankAccount = bankAccount;
        this.project = project;
        this.expense = expense;
        this.transactionDate = transactionDate;
        this.description = description;
        this.type = type;
        this.category = category;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.source = source;
        this.externalReference = externalReference;
        this.createdBy = createdBy;
    }

    public UUID getId() { return id; }
    public Company getCompany() { return company; }
    public BankAccount getBankAccount() { return bankAccount; }
    public Project getProject() { return project; }
    public Expense getExpense() { return expense; }
    public LocalDate getTransactionDate() { return transactionDate; }
    public String getDescription() { return description; }
    public CashTransactionType getType() { return type; }
    public CashTransactionCategory getCategory() { return category; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public CashTransactionSource getSource() { return source; }
    public String getExternalReference() { return externalReference; }
    public User getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}
