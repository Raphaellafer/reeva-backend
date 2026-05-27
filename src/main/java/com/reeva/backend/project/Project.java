package com.reeva.backend.project;

import com.reeva.backend.company.Company;
import com.reeva.backend.user.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 80)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "policy_text", columnDefinition = "TEXT")
    private String policyText;

    @Column(precision = 14, scale = 2)
    private BigDecimal revenue;

    @Column(name = "estimated_expense", precision = 14, scale = 2)
    private BigDecimal estimatedExpense;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected Project() {}

    public Project(Company company, String name, User createdBy) {
        this.company = company;
        this.name = name;
        this.createdBy = createdBy;
    }

    public UUID getId() { return id; }
    public Company getCompany() { return company; }
    public String getName() { return name; }
    public String getCode() { return code; }
    public String getDescription() { return description; }
    public String getPolicyText() { return policyText; }
    public BigDecimal getRevenue() { return revenue; }
    public BigDecimal getEstimatedExpense() { return estimatedExpense; }
    public boolean isActive() { return active; }
    public User getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setName(String name) { this.name = name; }
    public void setCode(String code) { this.code = code; }
    public void setDescription(String description) { this.description = description; }
    public void setPolicyText(String policyText) { this.policyText = policyText; }
    public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
    public void setEstimatedExpense(BigDecimal estimatedExpense) { this.estimatedExpense = estimatedExpense; }
    public void setActive(boolean active) { this.active = active; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
}
