package com.reeva.backend.expense;

import com.reeva.backend.common.audit.AuditService;
import com.reeva.backend.common.exception.BusinessException;
import com.reeva.backend.expense.attachment.AttachmentType;
import com.reeva.backend.expense.attachment.ExpenseAttachment;
import com.reeva.backend.expense.comment.CommentService;
import com.reeva.backend.expense.comment.dto.CommentRequest;
import com.reeva.backend.expense.comment.dto.CommentResponse;
import com.reeva.backend.expense.dto.ExpenseRequest;
import com.reeva.backend.expense.dto.ExpenseResponse;
import com.reeva.backend.expense.dto.ExpenseUpdateRequest;
import com.reeva.backend.storage.StorageService;
import com.reeva.backend.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final StorageService storageService;
    private final CommentService commentService;
    private final AuditService auditService;

    public ExpenseService(ExpenseRepository expenseRepository, StorageService storageService,
                          CommentService commentService, AuditService auditService) {
        this.expenseRepository = expenseRepository;
        this.storageService = storageService;
        this.commentService = commentService;
        this.auditService = auditService;
    }

    @Transactional
    public ExpenseResponse create(User currentUser, MultipartFile file, ExpenseRequest request) {
        StorageService.StoredFile stored = storageService.store(file);

        Expense expense = new Expense(
            currentUser.getCompany(), currentUser, request.title(), request.category(),
            request.amount(), request.expenseDate(),
            request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.OTHER
        );
        expense.setDescription(request.description());

        expense.getStatusHistory().add(
            new ExpenseStatusHistory(expense, null, ExpenseStatus.DRAFT, currentUser, "Expense created")
        );

        AttachmentType attachType = resolveAttachmentType(stored.mimeType());
        int sizeKb = (int) (stored.fileSize() / 1024);
        expense.getAttachments().add(
            new ExpenseAttachment(expense, currentUser, stored.originalName(),
                stored.filePath(), sizeKb, stored.mimeType(), attachType)
        );

        expenseRepository.save(expense);

        auditService.log(
            currentUser.getCompany().getId(), currentUser.getId(),
            "EXPENSE_CREATED", "Expense", expense.getId(),
            Map.of("title", request.title(), "amount", request.amount().toString()), null
        );

        return ExpenseResponse.from(expense);
    }

    @Transactional
    public ExpenseResponse submit(User currentUser, UUID expenseId) {
        Expense expense = getOwnedExpense(currentUser, expenseId);

        if (expense.getStatus() != ExpenseStatus.DRAFT) {
            throw BusinessException.badRequest("Only DRAFT expenses can be submitted");
        }

        ExpenseStatus from = expense.getStatus();
        expense.transitionTo(ExpenseStatus.SUBMITTED);
        expense.getStatusHistory().add(
            new ExpenseStatusHistory(expense, from, ExpenseStatus.SUBMITTED, currentUser, "Submitted by employee")
        );

        return ExpenseResponse.from(expenseRepository.save(expense));
    }

    @Transactional(readOnly = true)
    public Page<ExpenseResponse> listMine(User currentUser, Pageable pageable) {
        return expenseRepository.findByUserIdNotDeleted(currentUser.getId(), pageable)
            .map(ExpenseResponse::from);
    }

    @Transactional(readOnly = true)
    public ExpenseResponse findMine(User currentUser, UUID expenseId) {
        return ExpenseResponse.from(getOwnedExpense(currentUser, expenseId));
    }

    @Transactional(readOnly = true)
    public ExpenseStatus getStatus(User currentUser, UUID expenseId) {
        return getOwnedExpense(currentUser, expenseId).getStatus();
    }

    @Transactional
    public ExpenseResponse update(User currentUser, UUID expenseId, ExpenseUpdateRequest request) {
        Expense expense = getOwnedExpense(currentUser, expenseId);

        if (expense.getStatus() != ExpenseStatus.DRAFT) {
            throw BusinessException.badRequest("Only DRAFT expenses can be edited");
        }

        if (request.title() != null) expense.setTitle(request.title());
        if (request.description() != null) expense.setDescription(request.description());

        return ExpenseResponse.from(expenseRepository.save(expense));
    }

    @Transactional
    public void delete(User currentUser, UUID expenseId) {
        Expense expense = getOwnedExpense(currentUser, expenseId);

        if (expense.getStatus() != ExpenseStatus.DRAFT) {
            throw BusinessException.badRequest("Only DRAFT expenses can be deleted");
        }

        expense.setDeleted(true);
        expenseRepository.save(expense);
    }

    @Transactional
    public CommentResponse addComment(User currentUser, UUID expenseId, CommentRequest request) {
        return commentService.addComment(getOwnedExpense(currentUser, expenseId), currentUser, request);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> listComments(User currentUser, UUID expenseId) {
        getOwnedExpense(currentUser, expenseId);
        return commentService.listByExpense(expenseId);
    }

    private Expense getOwnedExpense(User user, UUID expenseId) {
        return expenseRepository.findByIdAndUserId(expenseId, user.getId())
            .orElseThrow(() -> BusinessException.notFound("Expense not found"));
    }

    private AttachmentType resolveAttachmentType(String mimeType) {
        if (mimeType == null) return AttachmentType.OTHER;
        return switch (mimeType) {
            case "application/pdf" -> AttachmentType.RECEIPT_PDF;
            case "image/jpeg", "image/png", "image/webp" -> AttachmentType.RECEIPT_IMAGE;
            default -> AttachmentType.OTHER;
        };
    }
}
