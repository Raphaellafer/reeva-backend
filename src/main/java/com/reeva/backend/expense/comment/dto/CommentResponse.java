package com.reeva.backend.expense.comment.dto;

import com.reeva.backend.expense.comment.ExpenseComment;
import com.reeva.backend.user.UserRole;

import java.time.Instant;
import java.util.UUID;

public record CommentResponse(
    UUID id,
    UUID expenseId,
    UUID authorId,
    String authorName,
    UserRole authorRole,
    String content,
    boolean internal,
    Instant createdAt
) {
    public static CommentResponse from(ExpenseComment c) {
        return new CommentResponse(
            c.getId(),
            c.getExpense().getId(),
            c.getUser().getId(),
            c.getUser().getName(),
            c.getUser().getRole(),
            c.getContent(),
            c.isInternal(),
            c.getCreatedAt()
        );
    }
}
