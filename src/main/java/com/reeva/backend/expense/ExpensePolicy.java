package com.reeva.backend.expense;

import com.reeva.backend.company.Company;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "expense_policies")
public class ExpensePolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(name = "max_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal maxAmount;

    @Column(name = "daily_limit", precision = 12, scale = 2)
    private BigDecimal dailyLimit;

    @Column(name = "monthly_limit", precision = 12, scale = 2)
    private BigDecimal monthlyLimit;

    @Column(name = "requires_receipt", nullable = false)
    private boolean requiresReceipt = true;

    @Column(name = "auto_approval_min_score", nullable = false)
    private short autoApprovalMinScore = 90;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ExpensePolicy() {}

    public ExpensePolicy(Company company, String category, BigDecimal maxAmount) {
        this.company = company;
        this.category = category;
        this.maxAmount = maxAmount;
    }

    public UUID getId() { return id; }
    public Company getCompany() { return company; }
    public String getCategory() { return category; }
    public BigDecimal getMaxAmount() { return maxAmount; }
    public BigDecimal getDailyLimit() { return dailyLimit; }
    public BigDecimal getMonthlyLimit() { return monthlyLimit; }
    public boolean isRequiresReceipt() { return requiresReceipt; }
    public short getAutoApprovalMinScore() { return autoApprovalMinScore; }
    public String getDescription() { return description; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setMaxAmount(BigDecimal maxAmount) { this.maxAmount = maxAmount; }
    public void setDailyLimit(BigDecimal dailyLimit) { this.dailyLimit = dailyLimit; }
    public void setMonthlyLimit(BigDecimal monthlyLimit) { this.monthlyLimit = monthlyLimit; }
    public void setRequiresReceipt(boolean requiresReceipt) { this.requiresReceipt = requiresReceipt; }
    public void setAutoApprovalMinScore(short autoApprovalMinScore) { this.autoApprovalMinScore = autoApprovalMinScore; }
    public void setDescription(String description) { this.description = description; }
    public void setActive(boolean active) { this.active = active; }
}
