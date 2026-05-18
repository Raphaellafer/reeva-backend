package com.reeva.backend.finance;

import com.reeva.backend.company.Company;
import com.reeva.backend.project.Project;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "bank_accounts")
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "bank_name", nullable = false, length = 120)
    private String bankName;

    @Column(name = "account_name", nullable = false, length = 120)
    private String accountName;

    @Column(length = 20)
    private String agency;

    @Column(name = "account_number", length = 40)
    private String accountNumber;

    @Column(name = "opening_balance", nullable = false, precision = 14, scale = 2)
    private BigDecimal openingBalance;

    @Column(name = "current_balance", nullable = false, precision = 14, scale = 2)
    private BigDecimal currentBalance;

    @Column(name = "opening_balance_date", nullable = false)
    private LocalDate openingBalanceDate;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected BankAccount() {}

    public BankAccount(Company company, Project project, String bankName, String accountName,
                       String agency, String accountNumber, BigDecimal openingBalance,
                       LocalDate openingBalanceDate) {
        this.company = company;
        this.project = project;
        this.bankName = bankName;
        this.accountName = accountName;
        this.agency = agency;
        this.accountNumber = accountNumber;
        this.openingBalance = openingBalance;
        this.currentBalance = openingBalance;
        this.openingBalanceDate = openingBalanceDate;
    }

    public UUID getId() { return id; }
    public Company getCompany() { return company; }
    public Project getProject() { return project; }
    public String getBankName() { return bankName; }
    public String getAccountName() { return accountName; }
    public String getAgency() { return agency; }
    public String getAccountNumber() { return accountNumber; }
    public BigDecimal getOpeningBalance() { return openingBalance; }
    public BigDecimal getCurrentBalance() { return currentBalance; }
    public LocalDate getOpeningBalanceDate() { return openingBalanceDate; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void apply(BigDecimal delta) {
        this.currentBalance = this.currentBalance.add(delta);
        this.updatedAt = Instant.now();
    }

    public void setActive(boolean active) {
        this.active = active;
        this.updatedAt = Instant.now();
    }
}
