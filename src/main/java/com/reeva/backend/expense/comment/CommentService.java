package com.reeva.backend.expense.comment;

import com.reeva.backend.expense.Expense;
import com.reeva.backend.expense.comment.dto.CommentRequest;
import com.reeva.backend.expense.comment.dto.CommentResponse;
import com.reeva.backend.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CommentService {

    private final CommentRepository commentRepository;

    public CommentService(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    @Transactional
    public CommentResponse addComment(Expense expense, User author, CommentRequest request) {
        ExpenseComment comment = new ExpenseComment(expense, author, request.content(), false);
        return CommentResponse.from(commentRepository.save(comment));
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> listByExpense(UUID expenseId) {
        return commentRepository.findByExpenseIdOrderByCreatedAtAsc(expenseId)
            .stream()
            .map(CommentResponse::from)
            .toList();
    }
}
