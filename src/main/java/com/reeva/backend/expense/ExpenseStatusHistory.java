package com.reeva.backend.expense;

import com.reeva.backend.user.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "expense_status_history")
public class ExpenseStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by")
    private User changedBy;  // null = sistema/IA

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", columnDefinition = "expense_status")
    private ExpenseStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, columnDefinition = "expense_status")
    private ExpenseStatus toStatus;

    @Column(name = "ai_score")
    private Short aiScore;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ExpenseStatusHistory() {}

    public ExpenseStatusHistory(Expense expense, ExpenseStatus fromStatus,
                                ExpenseStatus toStatus, User changedBy, String notes) {
        this.expense = expense;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.changedBy = changedBy;
        this.notes = notes;
    }

    public UUID getId() { return id; }
    public Expense getExpense() { return expense; }
    public User getChangedBy() { return changedBy; }
    public ExpenseStatus getFromStatus() { return fromStatus; }
    public ExpenseStatus getToStatus() { return toStatus; }
    public Short getAiScore() { return aiScore; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }

    public void setAiScore(Short aiScore) { this.aiScore = aiScore; }
}
