package com.reeva.backend.expense.comment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<ExpenseComment, UUID> {

    List<ExpenseComment> findByExpenseIdOrderByCreatedAtAsc(UUID expenseId);
}
