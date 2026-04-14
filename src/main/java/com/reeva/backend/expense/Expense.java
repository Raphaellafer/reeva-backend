package com.reeva.backend.expense;

import com.reeva.backend.company.Company;
import com.reeva.backend.company.Department;
import com.reeva.backend.expense.attachment.ExpenseAttachment;
import com.reeva.backend.expense.comment.ExpenseComment;
import com.reeva.backend.user.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    // ── Dados da despesa ─────────────────────────────────────────────

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "expense_category")
    private ExpenseCategory category;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "BRL";

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, columnDefinition = "payment_method")
    private PaymentMethod paymentMethod = PaymentMethod.OTHER;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    // ── Status e fluxo ───────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "expense_status")
    private ExpenseStatus status = ExpenseStatus.DRAFT;

    // ── Análise da IA ────────────────────────────────────────────────

    @Column(name = "ai_score")
    private Short aiScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_alert_level", nullable = false, columnDefinition = "ai_alert_level")
    private AiAlertLevel aiAlertLevel = AiAlertLevel.NONE;

    @Column(name = "ai_analysis", columnDefinition = "TEXT")
    private String aiAnalysis;

    @Column(name = "ai_checked_at")
    private Instant aiCheckedAt;

    // ── Aprovação do gestor ──────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private User manager;

    @Column(name = "manager_reviewed_at")
    private Instant managerReviewedAt;

    @Column(name = "manager_notes", columnDefinition = "TEXT")
    private String managerNotes;

    // ── Aprovação do financeiro ──────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finance_id")
    private User financeReviewer;

    @Column(name = "finance_reviewed_at")
    private Instant financeReviewedAt;

    @Column(name = "finance_notes", columnDefinition = "TEXT")
    private String financeNotes;

    // ── Pagamento ────────────────────────────────────────────────────

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "payment_reference", length = 255)
    private String paymentReference;

    // ── Metadados ────────────────────────────────────────────────────

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    // ── Relacionamentos ──────────────────────────────────────────────

    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<ExpenseAttachment> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<ExpenseStatusHistory> statusHistory = new ArrayList<>();

    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<ExpenseComment> comments = new ArrayList<>();

    protected Expense() {}

    public Expense(Company company, User user, String title, ExpenseCategory category,
                   BigDecimal amount, LocalDate expenseDate, PaymentMethod paymentMethod) {
        this.company = company;
        this.user = user;
        this.department = user.getDepartment();
        this.title = title;
        this.category = category;
        this.amount = amount;
        this.expenseDate = expenseDate;
        this.paymentMethod = paymentMethod;
    }

    public void transitionTo(ExpenseStatus newStatus) {
        this.status = newStatus;
        this.updatedAt = Instant.now();
    }

    // ── Getters ──────────────────────────────────────────────────────

    public UUID getId() { return id; }
    public Company getCompany() { return company; }
    public User getUser() { return user; }
    public Department getDepartment() { return department; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public ExpenseCategory getCategory() { return category; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public LocalDate getExpenseDate() { return expenseDate; }
    public ExpenseStatus getStatus() { return status; }
    public Short getAiScore() { return aiScore; }
    public AiAlertLevel getAiAlertLevel() { return aiAlertLevel; }
    public String getAiAnalysis() { return aiAnalysis; }
    public Instant getAiCheckedAt() { return aiCheckedAt; }
    public User getManager() { return manager; }
    public Instant getManagerReviewedAt() { return managerReviewedAt; }
    public String getManagerNotes() { return managerNotes; }
    public User getFinanceReviewer() { return financeReviewer; }
    public Instant getFinanceReviewedAt() { return financeReviewedAt; }
    public String getFinanceNotes() { return financeNotes; }
    public Instant getPaidAt() { return paidAt; }
    public String getPaymentReference() { return paymentReference; }
    public boolean isDeleted() { return deleted; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<ExpenseAttachment> getAttachments() { return attachments; }
    public List<ExpenseStatusHistory> getStatusHistory() { return statusHistory; }
    public List<ExpenseComment> getComments() { return comments; }

    // ── Setters ──────────────────────────────────────────────────────

    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
    public void setAiScore(Short aiScore) { this.aiScore = aiScore; }
    public void setAiAlertLevel(AiAlertLevel aiAlertLevel) { this.aiAlertLevel = aiAlertLevel; }
    public void setAiAnalysis(String aiAnalysis) { this.aiAnalysis = aiAnalysis; }
    public void setAiCheckedAt(Instant aiCheckedAt) { this.aiCheckedAt = aiCheckedAt; }
    public void setManager(User manager) { this.manager = manager; }
    public void setManagerReviewedAt(Instant managerReviewedAt) { this.managerReviewedAt = managerReviewedAt; }
    public void setManagerNotes(String managerNotes) { this.managerNotes = managerNotes; }
    public void setFinanceReviewer(User financeReviewer) { this.financeReviewer = financeReviewer; }
    public void setFinanceReviewedAt(Instant financeReviewedAt) { this.financeReviewedAt = financeReviewedAt; }
    public void setFinanceNotes(String financeNotes) { this.financeNotes = financeNotes; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
    public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }
}
