package com.reeva.backend.expense.comment;

import com.reeva.backend.expense.Expense;
import com.reeva.backend.user.User;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "expense_comments")
public class ExpenseComment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_internal", nullable = false)
    private boolean internal = false;  // true = visível apenas para gestores/financeiro

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ExpenseComment() {}

    public ExpenseComment(Expense expense, User user, String content, boolean internal) {
        this.expense = expense;
        this.user = user;
        this.content = content;
        this.internal = internal;
    }

    public UUID getId() { return id; }
    public Expense getExpense() { return expense; }
    public User getUser() { return user; }
    public String getContent() { return content; }
    public boolean isInternal() { return internal; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
