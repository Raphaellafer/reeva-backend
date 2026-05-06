package com.reeva.backend.finance;

import com.reeva.backend.company.Company;
import com.reeva.backend.project.Project;
import com.reeva.backend.user.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "project_financial_entries")
public class ProjectFinancialEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FinancialEntryType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 60)
    private FinancialEntryCategory category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, columnDefinition = "char(3)")
    private String currency = "BRL";

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private FinancialEntrySource source = FinancialEntrySource.AI_GENERATED_DEMO;

    @Column(name = "ai_model", length = 100)
    private String aiModel;

    @Column(name = "ai_prompt_summary", columnDefinition = "TEXT")
    private String aiPromptSummary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ProjectFinancialEntry() {}

    public ProjectFinancialEntry(Company company, Project project, FinancialEntryType type,
                                 FinancialEntryCategory category, String description,
                                 BigDecimal amount, LocalDate entryDate, FinancialEntrySource source,
                                 User createdBy) {
        this.company = company;
        this.project = project;
        this.type = type;
        this.category = category;
        this.description = description;
        this.amount = amount;
        this.entryDate = entryDate;
        this.source = source;
        this.createdBy = createdBy;
    }

    public UUID getId() { return id; }
    public Company getCompany() { return company; }
    public Project getProject() { return project; }
    public FinancialEntryType getType() { return type; }
    public FinancialEntryCategory getCategory() { return category; }
    public String getDescription() { return description; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public LocalDate getEntryDate() { return entryDate; }
    public FinancialEntrySource getSource() { return source; }
    public String getAiModel() { return aiModel; }
    public String getAiPromptSummary() { return aiPromptSummary; }
    public User getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setAiModel(String aiModel) { this.aiModel = aiModel; }
    public void setAiPromptSummary(String aiPromptSummary) { this.aiPromptSummary = aiPromptSummary; }
}
